import { api, db } from 'sdk';
import { eq } from 'sdk/db';
import { postSessions } from 'schema';
import { CONFIG, EMOJI } from 'lib/config';
import { tgEmoji, escapeHTML, inlineKeyboard } from 'lib/ui';
import { isAdminUser } from 'lib/upload';

const CANCEL_KB = { remove_keyboard: true };

function downloadMarkup() {
  return inlineKeyboard([
    [{ text: '⬇️ DOWNLOAD', url: `https://t.me/${CONFIG.BOT_USERNAME}?start=start` }],
    [{ text: '✏️ SUGGEST AN ADD-ON', url: CONFIG.REQUEST_BOT_URL }],
  ]);
}

async function getSession(userId) {
  return db.select().from(postSessions).where(eq(postSessions.userId, userId)).get();
}

async function saveSession(userId, data) {
  const existing = await getSession(userId);
  if (existing) {
    await db.update(postSessions).set(data).where(eq(postSessions.userId, userId)).run();
    return { ...existing, ...data };
  }
  const row = {
    userId,
    step: 'photo',
    photo: null,
    username: null,
    caption: null,
    createdAt: Math.floor(Date.now() / 1000),
    ...data,
  };
  await db.insert(postSessions).values(row).run();
  return row;
}

async function clearSession(userId) {
  await db.delete(postSessions).where(eq(postSessions.userId, userId)).run();
}

async function sendPrompt(chatId, text) {
  await api.sendMessage({
    chat_id: chatId,
    parse_mode: 'HTML',
    reply_markup: CANCEL_KB,
    text,
  });
}

export async function startPost(message) {
  const userId = message.from.id;
  await clearSession(userId);
  await saveSession(userId, { step: 'photo' });
  await sendPrompt(
    message.chat.id,
    [
      `${tgEmoji(EMOJI.MEGAPHONE, '📣')} <b>Manual post</b>`,
      '',
      'Send the <b>photo</b> for this post.',
      '',
      'Send /cancel to stop.',
    ].join('\n'),
  );
  return true;
}

async function publish(message, session) {
  const chatId = message.chat.id;
  if (!session.photo || !session.caption) {
    await clearSession(message.from.id);
    await sendPrompt(chatId, `${tgEmoji(EMOJI.CROSS, '❌')} Post cancelled: photo or caption missing.`);
    return true;
  }

  const credit = session.username
    ? `\n\n${tgEmoji(EMOJI.ENVELOPE, '✉️')}𝗨𝗣𝗟𝗢𝗔𝗗𝗘𝗗 𝗕𝗬: ${escapeHTML(session.username)}`
    : '';
  const caption = `${session.caption}${credit}`;

  try {
    const sent = await api.sendPhoto({
      chat_id: CONFIG.MAIN_CHANNEL_ID,
      photo: session.photo,
      caption,
      parse_mode: 'HTML',
      reply_markup: downloadMarkup(),
    });
    await clearSession(message.from.id);
    const link = sent && sent.message_id
      ? `https://t.me/${CONFIG.MAIN_CHANNEL_ID.slice(1)}/${sent.message_id}`
      : CONFIG.MAIN_CHANNEL_URL;
    await api.sendMessage({
      chat_id: chatId,
      parse_mode: 'HTML',
      reply_markup: CANCEL_KB,
      disable_web_page_preview: true,
      text: [
        `${tgEmoji(EMOJI.CHECK, '✔️')} <b>Posted to the main channel.</b>`,
        '',
        escapeHTML(link),
      ].join('\n'),
    });
  } catch (error) {
    await sendPrompt(
      chatId,
      `${tgEmoji(EMOJI.CROSS, '❌')} Posting failed: ${escapeHTML(String((error && error.message) || 'unknown error'))}`,
    );
  }
  return true;
}

export async function handlePost(message) {
  if (!message.chat || message.chat.type !== 'private') return false;
  if (!isAdminUser(message.from)) return false;

  const text = String(message.text || '').trim();
  const session = await getSession(message.from.id);

  if (/^\/post(?:@\w+)?$/i.test(text)) return startPost(message);
  if (!session) return false;

  if (/^\/(?:cancel|postcancel)(?:@\w+)?$/i.test(text) || text === 'Cancel upload') {
    await clearSession(message.from.id);
    await sendPrompt(message.chat.id, `${tgEmoji(EMOJI.CROSS, '❌')} Post cancelled.`);
    return true;
  }

  if (session.step === 'photo') {
    const photo = message.photo && message.photo.length > 0
      ? message.photo[message.photo.length - 1].file_id
      : null;
    if (!photo) {
      await sendPrompt(message.chat.id, `${tgEmoji(EMOJI.WARNING, '⚠️')} Send a <b>photo</b>, or /cancel.`);
      return true;
    }
    await saveSession(message.from.id, { photo, step: 'caption' });
    await sendPrompt(
      message.chat.id,
      [
        `${tgEmoji(EMOJI.PENCIL, '✏️')} Photo saved.`,
        '',
        'Now send the <b>caption</b> (HTML allowed).',
        '',
        'Send /cancel to stop.',
      ].join('\n'),
    );
    return true;
  }

  if (session.step === 'caption') {
    if (!text || text.startsWith('/')) {
      await sendPrompt(message.chat.id, `${tgEmoji(EMOJI.WARNING, '⚠️')} Send the caption text, or /cancel.`);
      return true;
    }
    await saveSession(message.from.id, { caption: text, step: 'username' });
    await sendPrompt(
      message.chat.id,
      [
        `${tgEmoji(EMOJI.PENCIL, '✏️')} Caption saved.`,
        '',
        'Send a <b>username</b> to credit the uploader, or /skip.',
        '',
        'Send /cancel to stop.',
      ].join('\n'),
    );
    return true;
  }

  if (session.step === 'username') {
    const skip = /^(?:\/skip|\/none|skip|none)$/i.test(text);
    if (!skip && (!text || text.startsWith('/'))) {
      await sendPrompt(message.chat.id, `${tgEmoji(EMOJI.WARNING, '⚠️')} Send a username, /skip, or /cancel.`);
      return true;
    }
    const username = skip ? null : text;
    const ready = await saveSession(message.from.id, { username, step: 'ready' });
    return publish(message, ready);
  }

  return false;
}
