import { deleteWebsite } from 'lib/web_sync';
import { api, db } from 'sdk';
import { eq } from 'sdk/db';
import { files } from 'schema';
import { CONFIG, EMOJI } from 'lib/config';
import { tgEmoji, escapeHTML } from 'lib/ui';
import { extractMarketplaceUuid } from 'lib/marketplace';

export function isDeleteCommand(message) {
  return /^\/delete(?:@\w+)?(?:\s|$)/i.test(String(message.text || '').trim());
}

export function deleteArg(message) {
  return String(message.text || '').replace(/^\/delete(?:@\w+)?\s*/i, '').trim();
}

export function parseTmeLink(link) {
  const match = /^https?:\/\/t\.me\/([A-Za-z0-9_]+)\/(\d+)$/.exec(String(link || ''));
  if (!match) return null;
  return { channel: match[1], messageId: Number(match[2]) };
}

export async function deleteMessageLink(link) {
  const parsed = parseTmeLink(link);
  if (!parsed) return 0;
  try {
    await api.deleteMessage({ chat_id: `@${parsed.channel}`, message_id: parsed.messageId });
    return 1;
  } catch {
    return 0;
  }
}

export async function handleDelete(message) {
  if (!isDeleteCommand(message)) return false;
  if (!message.from || message.from.id !== CONFIG.ADMIN_ID) return true;

  const chatId = message.chat.id;
  const arg = deleteArg(message);
  const uuid = extractMarketplaceUuid(arg);

  if (!uuid) {
    await api.sendMessage({
      chat_id: chatId,
      parse_mode: 'HTML',
      text: `${tgEmoji(EMOJI.WARNING, '⚠️')} <b>Usage:</b> <code>/delete &lt;Marketplace link or UUID&gt;</code>`,
    });
    return true;
  }

  const fileRow = await db.select().from(files).where(eq(files.uuid, uuid)).get();
  if (!fileRow) {
    await api.sendMessage({
      chat_id: chatId,
      parse_mode: 'HTML',
      text: [
        `${tgEmoji(EMOJI.WARNING, '⚠️')} <b>No file-bot record found</b>`,
        '',
        `Nothing matches <code>${escapeHTML(uuid)}</code>.`,
      ].join('\n'),
    });
    return true;
  }

  const deleted = fileRow.messageLink ? await deleteMessageLink(fileRow.messageLink) : 0;
  await db.delete(files).where(eq(files.uuid, uuid)).run();
  const websiteSynced = await deleteWebsite(uuid);

  const label = fileRow.title || fileRow.name || fileRow.uuid;
  await api.sendMessage({
    chat_id: chatId,
    parse_mode: 'HTML',
    text: [
      `${tgEmoji(EMOJI.CHECK, '✔️')} <b>Deleted from file bot!</b>`,
      '',
      `<b>${escapeHTML(label)}</b> was removed.`,
      `• File record removed: <b>1</b>`,
      ...(websiteSynced ? [] : ['⚠️ Website deletion failed; contact the site maintainer.']),
      `• Channel message deleted: <b>${deleted}</b>`,
      '',
      `<i>Marketplace UUID:</i> <code>${escapeHTML(uuid)}</code>`,
    ].join('\n'),
  });
  return true;
}
