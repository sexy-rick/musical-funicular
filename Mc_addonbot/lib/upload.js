import { api, db } from 'sdk';
import { eq } from 'sdk/db';
import { uploadSessions } from 'schema';
import { CONFIG, EMOJI } from 'lib/config';
import { tgEmoji, inlineKeyboard } from 'lib/ui';

const ADMINS = [CONFIG.ADMIN_ID];

export const CHANNELS = [
  { id: '@Minecraft_addon_free_download', label: 'Main channel (minecraft add-on free download)' },
  { id: '@rl_craft_free_download_minecraft', label: 'Honeyfrost addons (rl craft free.....)' },
  { id: '@action_and_stuff_free_download', label: 'Action and stuff' },
];

export function isAdminUser(user) {
  return Boolean(user && ADMINS.includes(user.id));
}

function textOf(message) {
  return String((message && message.text) || '').trim();
}

function selectedDefault() {
  return ['@Minecraft_addon_free_download'];
}

function safeSelected(session) {
  if (session && Array.isArray(session.selectedChannels) && session.selectedChannels.length > 0) {
    return session.selectedChannels;
  }
  return selectedDefault();
}

export async function getSession(userId) {
  return db.select().from(uploadSessions).where(eq(uploadSessions.userId, userId)).get();
}

export async function saveSession(userId, data) {
  const existing = await getSession(userId);
  if (existing) {
    await db.update(uploadSessions).set(data).where(eq(uploadSessions.userId, userId)).run();
    return { ...existing, ...data };
  }
  const row = {
    userId,
    uuid: '',
    category: null,
    name: null,
    files: [],
    paused: 0,
    requestedBy: 'None',
    requestedByUserId: null,
    status: null,
    marketplaceUrl: null,
    thumbnailUrl: null,
    title: null,
    creator: null,
    selectedChannels: selectedDefault(),
    mediaId: `MID_${Date.now()}`,
    requestedAddon: null,
    requestId: null,
    requestedMeta: null,
    autoRecognised: 0,
    createdAt: Math.floor(Date.now() / 1000),
    ...data,
  };
  await db.insert(uploadSessions).values(row).run();
  return row;
}

export async function deleteSession(userId) {
  await db.delete(uploadSessions).where(eq(uploadSessions.userId, userId)).run();
}

function uploadKeyboard(selected) {
  const rows = CHANNELS.map((channel, index) => {
    const on = selected.includes(channel.id);
    return [{ text: `${on ? '✅' : '❌'} ${channel.label}`, callback_data: `/upload toggle ${index}` }];
  });
  rows.push([
    { text: '🗑 Close', callback_data: '/upload close' },
    { text: '✅ All', callback_data: '/upload all' },
    { text: '⚡️ Upload', callback_data: '/upload start' },
  ]);
  return inlineKeyboard(rows);
}

function settingsText() {
  return [
    `${tgEmoji('5341715473882955310', '⚙️')} <b>Upload Settings</b>`,
    '',
    'Select the target channels for this upload:',
  ].join('\n');
}

async function sendSettings(chatId, selected) {
  await api.sendMessage({
    chat_id: chatId,
    parse_mode: 'HTML',
    reply_markup: uploadKeyboard(selected),
    text: settingsText(),
  });
}

async function editSettings(query, selected) {
  try {
    await api.editMessageText({
      chat_id: query.message.chat.id,
      message_id: query.message.message_id,
      parse_mode: 'HTML',
      reply_markup: uploadKeyboard(selected),
      text: settingsText(),
    });
  } catch {
    await sendSettings(query.message.chat.id, selected);
  }
}

function startedKeyboard() {
  return { resize_keyboard: true, keyboard: [[{ text: 'Finish upload' }, { text: 'Cancel upload' }]] };
}

async function sendStarted(chatId) {
  await api.sendMessage({
    chat_id: chatId,
    parse_mode: 'HTML',
    reply_markup: startedKeyboard(),
    text: [
      `${tgEmoji(EMOJI.DOWN, '⬇️')} <b>Upload started</b>`,
      '',
      '• Send photos / videos / files',
      '• Then press Finish',
    ].join('\n'),
  });
}

const NOT_AUTHORIZED = `${tgEmoji(EMOJI.CROSS, '❌')} You are not authorized.`;
const CANCELLED = `${tgEmoji(EMOJI.CROSS, '❌')} Upload cancelled.`;

export async function handleUpload(message) {
  if (!message.chat || message.chat.type !== 'private') return false;
  const text = textOf(message);
  const isCancel = /^\/cancelupload(?:@\w+)?$/i.test(text) || text === 'Cancel upload';
  const isUpload = /^\/upload(?:@\w+)?(?:\s|$)/i.test(text);

  if (!isCancel && !isUpload) return false;

  if (!isAdminUser(message.from)) {
    await api.sendMessage({ chat_id: message.chat.id, parse_mode: 'HTML', text: NOT_AUTHORIZED });
    return true;
  }

  if (isCancel) {
    await deleteSession(message.from.id);
    await api.sendMessage({
      chat_id: message.chat.id,
      parse_mode: 'HTML',
      reply_markup: { remove_keyboard: true },
      text: CANCELLED,
    });
    return true;
  }

  const existing = await getSession(message.from.id);
  const selected = safeSelected(existing);
  if (existing) {
    await saveSession(message.from.id, {
      uuid: '',
      files: [],
      paused: 0,
      requestedBy: 'None',
      requestedByUserId: null,
      status: null,
      category: null,
      name: null,
      title: null,
      creator: null,
      thumbnailUrl: null,
      marketplaceUrl: null,
      selectedChannels: selected,
      mediaId: `MID_${Date.now()}`,
    });
  } else {
    await saveSession(message.from.id, { selectedChannels: selected });
  }
  await sendSettings(message.chat.id, selected);
  return true;
}

export async function handleUploadCallback(query) {
  const data = String((query && query.data) || '');
  if (!/^\/upload(?:\s|$)/.test(data)) return false;

  if (!isAdminUser(query.from)) {
    await api.answerCallbackQuery({ callback_query_id: query.id, text: 'You are not authorized.', show_alert: true });
    return true;
  }

  const [, action, arg] = data.split(' ');
  const userId = query.from.id;
  const session = await getSession(userId);
  let selected = safeSelected(session);

  if (action === 'toggle') {
    const index = Number(arg);
    const channel = CHANNELS[index];
    if (channel) {
      selected = selected.includes(channel.id)
        ? selected.filter((entry) => entry !== channel.id)
        : [...selected, channel.id];
      await saveSession(userId, { selectedChannels: selected });
      await editSettings(query, selected);
    }
    await api.answerCallbackQuery({ callback_query_id: query.id });
    return true;
  }

  if (action === 'all') {
    selected = CHANNELS.map((channel) => channel.id);
    await saveSession(userId, { selectedChannels: selected });
    await editSettings(query, selected);
    await api.answerCallbackQuery({ callback_query_id: query.id });
    return true;
  }

  if (action === 'close') {
    try {
      await api.deleteMessage({ chat_id: query.message.chat.id, message_id: query.message.message_id });
    } catch {
      await api.answerCallbackQuery({ callback_query_id: query.id });
      return true;
    }
    await api.answerCallbackQuery({ callback_query_id: query.id });
    return true;
  }

  if (action === 'start') {
    if (selected.length === 0) {
      await api.answerCallbackQuery({ callback_query_id: query.id, text: 'Warning: Select at least 1 channel!', show_alert: true });
      return true;
    }
    await saveSession(userId, {
      selectedChannels: selected,
      uuid: '',
      files: [],
      paused: 0,
      requestedBy: 'None',
      requestedByUserId: null,
      status: null,
      category: null,
      name: null,
      title: null,
      creator: null,
      thumbnailUrl: null,
      marketplaceUrl: null,
      mediaId: (session && session.mediaId) || `MID_${Date.now()}`,
    });
    try {
      await api.deleteMessage({ chat_id: query.message.chat.id, message_id: query.message.message_id });
    } catch {
      await api.answerCallbackQuery({ callback_query_id: query.id });
    }
    await sendStarted(query.message.chat.id);
    await api.answerCallbackQuery({ callback_query_id: query.id });
    return true;
  }

  await api.answerCallbackQuery({ callback_query_id: query.id });
  return true;
}
