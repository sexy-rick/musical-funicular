import { api, db } from 'sdk';
import { eq } from 'sdk/db';
import { files } from 'schema';
import { CONFIG, EMOJI } from 'lib/config';
import { tgEmoji, escapeHTML, inlineKeyboard } from 'lib/ui';
import { isAdminUser } from 'lib/upload';
import { buildCaption, fileExt, formatSize } from 'lib/handle_media';
import { extractMarketplaceUuid } from 'lib/marketplace';

const ALL_CHANNELS = [
  CONFIG.MAIN_CHANNEL_ID,
  CONFIG.ACTION_CHANNEL_ID,
  CONFIG.SKIN_CHANNEL_ID,
  CONFIG.BEDROCK_CHANNEL_ID,
  CONFIG.RL_CRAFT_CHANNEL_ID,
];

export async function findStoredFile(uuid) {
  if (!uuid) return null;
  return db.select().from(files).where(eq(files.uuid, uuid)).get();
}

function itemsOf(row) {
  return Array.isArray(row && row.items) ? row.items : [];
}

function totalSize(row) {
  const items = itemsOf(row);
  if (items.length === 0) return 0;
  return items.reduce((sum, item) => sum + (Number(item.size) || 0), 0);
}

function markupFor(row) {
  return inlineKeyboard([
    [{ text: '⬇️ DOWNLOAD', url: `https://t.me/${CONFIG.BOT_USERNAME}?start=MT-${encodeURIComponent(row.uuid)}` }],
    [{ text: '✏️ SUGGEST AN ADD-ON', url: CONFIG.REQUEST_BOT_URL }],
  ]);
}

export function captionFor(row) {
  const fileName = row.name || row.title || 'addon';
  const session = {
    uuid: row.uuid,
    title: row.title || fileName,
    creator: row.creator || null,
    marketplaceUrl: row.marketplaceUrl || null,
    requestedMeta: { version: row.version || null },
    requestedBy: null,
  };
  return buildCaption(
    session,
    row.category || 'Unknown',
    fileName,
    fileExt(fileName),
    formatSize(totalSize(row)),
  );
}

async function sendStoredTo(target, row, caption) {
  if (row.thumbnailUrl) {
    return api.sendPhoto({
      chat_id: target,
      photo: row.thumbnailUrl,
      caption,
      parse_mode: 'HTML',
      reply_markup: markupFor(row),
    });
  }
  return api.sendMessage({
    chat_id: target,
    text: caption,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: markupFor(row),
  });
}

export async function broadcastStored(row, targets) {
  const caption = captionFor(row);
  const results = [];
  for (const target of targets) {
    try {
      const sent = await sendStoredTo(target, row, caption);
      const link = target.startsWith('@') && sent && sent.message_id
        ? `https://t.me/${target.slice(1)}/${sent.message_id}`
        : '';
      results.push({ target, ok: true, link });
    } catch (error) {
      results.push({ target, ok: false, error: String((error && error.message) || 'unknown error') });
    }
  }
  return results;
}

function parseForwardArgs(text) {
  const stripped = String(text || '').replace(/^\/forward(?:@\w+)?\s*/i, '').trim();
  const uuid = extractMarketplaceUuid(stripped);
  if (!uuid) return { uuid: null, channel: null };
  const channelRaw = stripped.replace(uuid, '').trim();
  const channel = /^@\w{4,}$/.test(channelRaw) ? channelRaw : null;
  return { uuid, channel };
}

async function forwardReply(message, channel) {
  const reply = message.reply_to_message;
  const targets = channel ? [channel] : ALL_CHANNELS;
  const results = [];
  for (const target of targets) {
    try {
      const sent = await api.forwardMessage({
        chat_id: target,
        from_chat_id: message.chat.id,
        message_id: reply.message_id,
      });
      const link = target.startsWith('@') && sent && sent.message_id
        ? `https://t.me/${target.slice(1)}/${sent.message_id}`
        : '';
      results.push({ target, ok: true, link });
    } catch (error) {
      results.push({ target, ok: false, error: String((error && error.message) || 'unknown error') });
    }
  }
  return results;
}

function reportLines(title, results) {
  const ok = results.filter((item) => item.ok).length;
  const lines = [
    ok > 0 ? `${tgEmoji(EMOJI.CHECK, '✔️')} <b>${title}</b>` : `${tgEmoji(EMOJI.CROSS, '❌')} <b>Broadcast failed</b>`,
    '',
    `Posted <b>${ok}</b>/<b>${results.length}</b>`,
  ];
  for (const result of results) {
    if (result.ok) {
      lines.push(`${tgEmoji(EMOJI.CHECK, '✔️')} ${escapeHTML(result.target)}${result.link ? ` — ${escapeHTML(result.link)}` : ''}`);
    } else {
      lines.push(`${tgEmoji(EMOJI.CROSS, '❌')} ${escapeHTML(result.target)} — ${escapeHTML(result.error)}`);
    }
  }
  return lines;
}

export async function handleForward(message) {
  if (!message.chat || message.chat.type !== 'private') return false;
  if (!message.text || !/^\/forward(?:@\w+)?(?:\s|$)/i.test(String(message.text).trim())) return false;
  if (!isAdminUser(message.from)) return false;

  const chatId = message.chat.id;
  const { uuid, channel } = parseForwardArgs(message.text);

  if (!uuid && message.reply_to_message) {
    const results = await forwardReply(message, channel);
    await api.sendMessage({
      chat_id: chatId,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      text: reportLines('Forward finished', results).join('\n'),
    });
    return true;
  }

  if (!uuid) {
    await api.sendMessage({
      chat_id: chatId,
      parse_mode: 'HTML',
      text: [
        `${tgEmoji(EMOJI.MEGAPHONE, '📣')} <b>Broadcast a stored file</b>`,
        '',
        'Reply to a message with /forward to broadcast it.',
        '',
        'Usage:',
        '',
        `<code>/forward &lt;uuid&gt;</code>`,
        `<code>/forward &lt;uuid&gt; @channel</code>`,
        '',
        'Without a channel it posts to every channel.',
      ].join('\n'),
    });
    return true;
  }

  const row = await findStoredFile(uuid);
  if (!row) {
    await api.sendMessage({
      chat_id: chatId,
      parse_mode: 'HTML',
      text: [
        `${tgEmoji(EMOJI.CROSS, '❌')} No stored file for that UUID.`,
        '',
        `<code>${escapeHTML(uuid)}</code>`,
      ].join('\n'),
    });
    return true;
  }

  const targets = channel ? [channel] : ALL_CHANNELS;
  const results = await broadcastStored(row, targets);

  await api.sendMessage({
    chat_id: chatId,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    text: reportLines('Broadcast finished', results).join('\n'),
  });
  return true;
}
