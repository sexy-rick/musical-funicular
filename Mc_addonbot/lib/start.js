import { api, db } from 'sdk';
import { eq } from 'sdk/db';
import { users, files } from 'schema';
import { CONFIG, REQUIRED_CHANNELS, EMOJI } from 'lib/config';
import { tgEmoji, escapeHTML, userMention, inlineKeyboard, isMarkupError } from 'lib/ui';
import { describeError, isOwner, notifyOwner } from 'lib/diag';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseStartPayload(text) {
  const match = /^\/start(?:@\w+)?(?:\s+(.+))?$/i.exec(String(text || '').trim());
  if (!match) return null;
  const payload = match[1];
  if (!payload) return '';
  try {
    return decodeURIComponent(payload);
  } catch {
    return payload;
  }
}

async function rememberUser(message) {
  const from = message.from;
  if (!from || !Number.isInteger(from.id)) return;
  const existing = await db.select().from(users).where(eq(users.id, from.id)).get();
  if (existing) {
    await db.update(users)
      .set({ firstName: from.first_name || null, username: from.username ? `@${from.username}` : null })
      .where(eq(users.id, from.id))
      .run();
    return;
  }
  await db.insert(users).values({
    id: from.id,
    firstName: from.first_name || null,
    username: from.username ? `@${from.username}` : null,
    joinedAt: Math.floor(Date.now() / 1000),
  }).run();

  const name = userMention(from.id, `${from.first_name || ''} ${from.last_name || ''}`.trim());
  const usernameLine = from.username
    ? `${tgEmoji(EMOJI.LINK, '🔗')} Username: <a href="https://t.me/${from.username}">@${from.username}</a>`
    : `${tgEmoji(EMOJI.LINK, '🔗')} Username: No Username`;
  try {
    await api.sendMessage({
      chat_id: CONFIG.ADMIN_ID,
      parse_mode: 'HTML',
      text: [
        `${tgEmoji(EMOJI.LIGHTNING, '⚡️')} <b>New User Joined</b>`,
        '',
        `${tgEmoji(EMOJI.DISGUISE, '👀')} Name: ${name}`,
        `${tgEmoji(EMOJI.ID, 'ℹ️')} ID: <code>${from.id}</code>`,
        usernameLine,
      ].join('\n'),
    });
  } catch {
    return;
  }
}

function requiredChannels() {
  if (REQUIRED_CHANNELS.length > 0) return REQUIRED_CHANNELS;
  return [{ id: CONFIG.MAIN_CHANNEL_ID, link: CONFIG.MAIN_CHANNEL_URL, name: 'Minecraft Addons' }];
}

function normalizeChatMember(response) {
  if (!response) return null;
  if (response.result) return response.result;
  return response;
}

function isJoinedMember(member) {
  if (!member || typeof member.status !== 'string') return false;
  if (member.status === 'creator' || member.status === 'administrator' || member.status === 'member') return true;
  if (member.status === 'restricted') return member.is_member !== false;
  return false;
}

export async function checkRequiredChannels(userId) {
  const checks = requiredChannels().map(async (channel) => {
    try {
      const member = await api.getChatMember({ chat_id: channel.id, user_id: userId });
      const state = isJoinedMember(normalizeChatMember(member)) ? 'joined' : 'missing';
      return { channel, state, error: null };
    } catch (error) {
      return { channel, state: 'unverified', error: describeError(error) };
    }
  });
  return Promise.all(checks);
}

async function reportUnverifiedChannels(unverified) {
  if (unverified.length === 0) return;
  const lines = [
    'Membership cannot be checked, so those channels are not blocking anyone.',
    '',
    ...unverified.map((entry) => `<b>${escapeHTML(entry.channel.id)}</b> — <code>${escapeHTML(entry.error)}</code>`),
    '',
    'Add the bot as an administrator in each channel above.',
  ];
  const key = `gate:${unverified.map((entry) => entry.channel.id).join(',')}`;
  await notifyOwner(lines.join('\n'), key);
}

async function sendJoinGate(chatId, payload, leftChannels) {
  const rows = [];
  for (let i = 0; i < leftChannels.length; i += 2) {
    rows.push(leftChannels.slice(i, i + 2).map((channel) => ({ text: `📣 Join ${channel.name}`, url: channel.link })));
  }
  const retry = payload ? encodeURIComponent(payload) : 'start';
  rows.push([{ text: '✅ I Joined All (Retry)', url: `https://t.me/${CONFIG.BOT_USERNAME}?start=${retry}` }]);
  const markup = inlineKeyboard(rows);
  const text = [
    `${tgEmoji(EMOJI.WARNING, '⚠️')} <b>Access Denied</b>`,
    '',
    'Please join all required channels.',
    '',
    `By clicking <b>I Joined All</b>, you agree to our <a href="${CONFIG.TERMS_URL}">Terms &amp; Conditions</a> to continue.`,
  ].join('\n');

  try {
    await api.sendMessage({
      chat_id: chatId,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: markup,
      text,
    });
    return;
  } catch (error) {
    if (!isMarkupError(error)) throw error;
    await notifyOwner([
      'The join gate keyboard was rejected, so it was rebuilt without styling.',
      '',
      `<code>${escapeHTML(describeError(error))}</code>`,
      '',
      `<code>${escapeHTML(JSON.stringify(markup || {}).slice(0, 900))}</code>`,
    ], 'gate-markup');
    try {
      await api.sendMessage({
        chat_id: chatId,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: inlineKeyboard(rows, { plain: true }),
        text,
      });
      return;
    } catch (plainError) {
      if (!isMarkupError(plainError)) throw plainError;
    }
    const links = leftChannels
      .map((channel) => `${tgEmoji(EMOJI.MEGAPHONE, '📣')} <a href="${escapeHTML(channel.link)}">Join ${escapeHTML(channel.name)}</a>`)
      .join('\n');
    await api.sendMessage({
      chat_id: chatId,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      text: [
        `${tgEmoji(EMOJI.WARNING, '⚠️')} <b>Access Denied</b>`,
        '',
        links,
        '',
        `Join, then open this link again to continue ${tgEmoji(EMOJI.LINK, '🔗')}`,
        `<a href="https://t.me/${CONFIG.BOT_USERNAME}?start=${retry}">https://t.me/${CONFIG.BOT_USERNAME}?start=${retry}</a>`,
      ].join('\n'),
    });
  }
}

const SUGGESTED_CHANNELS = [
  { id: '@Minecraft_skin_pack_and_addon', name: 'MINECRAFT SKIN PACK', emoji: '5325547803936572038', link: 'https://t.me/Minecraft_skin_pack_and_addon' },
  { id: '@memeecraft', name: 'MEME CHANNEL', emoji: '5269531045165816230', link: 'https://t.me/memeecraft' },
  { id: '@marketplace_trader', name: 'BACK-UP CHANNEL', emoji: '5251203410396458957', link: 'https://t.me/marketplace_trader' },
];

async function sendSuggestedChannels(message) {
  const missing = [];
  for (const channel of SUGGESTED_CHANNELS) {
    try {
      const member = await api.getChatMember({ chat_id: channel.id, user_id: message.from.id });
      if (!isJoinedMember(normalizeChatMember(member))) missing.push(channel);
    } catch {
      missing.push(channel);
    }
  }
  if (missing.length === 0) return;
  const rows = [];
  for (let i = 0; i < missing.length; i += 2) {
    rows.push(missing.slice(i, i + 2).map((channel) => ({ text: channel.name, url: channel.link })));
  }
  await api.sendMessage({
    chat_id: message.chat.id,
    parse_mode: 'HTML',
    reply_markup: inlineKeyboard(rows),
    text: `Join our channels for epic updates & zero FOMO! (Totally optional, but you'll regret missing the vibes) ${tgEmoji('5269531045165816230', '🤡')}🙏`,
  });
}

async function sendWelcome(chatId) {
  await api.sendMessage({
    chat_id: chatId,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: inlineKeyboard([[{ text: '🔥 OUR CHANNEL', url: CONFIG.MAIN_CHANNEL_URL }]]),
    text: [
      `${tgEmoji(EMOJI.CHECK, '✔️')} <b>𝗪𝗘𝗟𝗖𝗢𝗠𝗘 𝗧𝗢 𝗠𝗔𝗥𝗞𝗘𝗧𝗣𝗟𝗔𝗖𝗘 𝗙𝗜𝗟𝗘 𝗦𝗛𝗔𝗥𝗜𝗡𝗚 𝗕𝗢𝗧 ${tgEmoji(EMOJI.COMPUTER, '🖥')}</b>`,
      `With this bot, you can download all shared files securely ${tgEmoji(EMOJI.SHIELD, '🔒')} ${tgEmoji(EMOJI.SPARKLES, '✨')}`,
    ].join('\n'),
  });
}

async function sendOldMovedMessage(chatId, payload) {
  await api.sendMessage({
    chat_id: chatId,
    parse_mode: 'HTML',
    reply_markup: inlineKeyboard([[{ text: '⬇️ OPEN OLD FILE', url: `https://t.me/${CONFIG.OLD_FILES_BOT_USERNAME}?start=${encodeURIComponent(payload)}` }]]),
    text: [
      `${tgEmoji(EMOJI.WARNING, '⚠️')} <b>Old File Link Detected</b>`,
      '',
      `This old file has been moved to <b>@${CONFIG.OLD_FILES_BOT_USERNAME}</b>.`,
      '',
      `${tgEmoji(EMOJI.LINK, '🔗')} Tap the button below to open the same file in the old-file bot.`,
    ].join('\n'),
  });
}

async function sendUnavailableMessage(chatId, isNewUuid) {
  const lines = [
    `${tgEmoji(EMOJI.CROSS, '❌')} <b>File Not Available</b>`,
    '',
    'This file is not available in this bot right now.',
  ];
  if (isNewUuid) {
    lines.push(`${tgEmoji(EMOJI.PENCIL, '✏️')} It is currently unavailable here. Try requesting it.`);
  }
  lines.push('');
  lines.push(`${tgEmoji(EMOJI.ENVELOPE, '✉️')} Please check the backup channel or follow the tutorial for how to search add-ons.`);
  await api.sendMessage({
    chat_id: chatId,
    parse_mode: 'HTML',
    reply_markup: inlineKeyboard([
      [{ text: '📦 BACKUP CHANNEL', url: CONFIG.BACKUP_CHANNEL_URL }],
      [{ text: '🔍 HOW TO SEARCH ADD-ON', url: CONFIG.SEARCH_TUTORIAL_URL }],
      [{ text: '✏️ REQUEST THIS ADD-ON', url: CONFIG.REQUEST_BOT_URL }],
    ]),
    text: lines.join('\n'),
  });
}

export function downloadCaption() {
  return `${tgEmoji(EMOJI.DIAMOND, '💎')} <a href="${CONFIG.ADDLIST_URL}"><b>𝙎𝙐𝘽𝙎𝘾𝙍𝙄𝘽𝙀 𝙏𝙊 𝘼𝙇𝙇 𝘾𝙃𝘼𝙉𝙉𝙀𝙇𝙎</b></a>`;
}

function mediaParams(base, caption) {
  if (!caption) return base;
  return { ...base, caption, parse_mode: 'HTML' };
}

async function sendMediaItem(chatId, item, caption) {
  const type = item.type || 'document';
  try {
    if (type === 'photo') {
      await api.sendPhoto({ chat_id: chatId, photo: item.fileId });
      return true;
    }
    if (type === 'video') {
      await api.sendVideo(mediaParams({ chat_id: chatId, video: item.fileId }, caption));
      return true;
    }
    await api.sendDocument(mediaParams({ chat_id: chatId, document: item.fileId }, caption));
    return true;
  } catch {
    return false;
  }
}

async function sendDownloadThumbnail(chatId, fileRow) {
  if (!fileRow || !fileRow.thumbnailUrl) return;
  try {
    await api.sendPhoto({ chat_id: chatId, photo: fileRow.thumbnailUrl });
  } catch {
    return;
  }
}

function requestBotUrl() {
  return 'https://t.me/MARKETPLACE_TRADER_HELPER_BOT';
}

const PROMOS = [
  () => ({
    text: [
      `${tgEmoji(EMOJI.FIRE, '🔥')} <b>Get All Add-ons in One Click!</b>`,
      '',
      `Join our complete folder to never miss an epic update and keep your library completely up-to-date! ${tgEmoji(EMOJI.SPARKLES, '✨')}`,
    ].join('\n'),
    rows: [[{ text: '✉️ ALL ADD-ONS', url: CONFIG.ADDLIST_URL }]],
  }),
  () => ({
    text: [
      `${tgEmoji(EMOJI.SPARKLES, '✨')} <b>Explore Our Premium Webapp!</b>`,
      '',
      `Want a cleaner, faster search experience? Open our official Webapp to browse thousands of Minecraft mods, skins, and texture packs in a gorgeous, ad-free interface! ${tgEmoji(EMOJI.LIGHTNING, '⚡️')}`,
    ].join('\n'),
    rows: [[{ text: '✨ OPEN WEBAPP', url: `https://t.me/${CONFIG.BOT_USERNAME}/web` }]],
  }),
  () => ({
    text: [
      `${tgEmoji(EMOJI.SHIELD, '🛡')} <b>Try Our Instant Search Bot!</b>`,
      '',
      `Looking for a specific addon, map, or skin pack? Simply type your search query in our lightning-fast search companion to fetch direct download files instantly! ${tgEmoji(EMOJI.LIGHTNING, '⚡️')}`,
    ].join('\n'),
    rows: [[{ text: '🛡 SEARCH BOT', url: 'https://t.me/MTAddons_BOT' }]],
  }),
  () => ({
    text: [
      `${tgEmoji(EMOJI.PENCIL, '✏️')} <b>Can't Find Your Mod? Request It!</b>`,
      '',
      `If you are searching for a specific addon or marketplace pack that isn't indexed yet, submit your request directly to our Helper Bot and we'll craft it for you! ${tgEmoji(EMOJI.SPARKLES, '✨')}`,
    ].join('\n'),
    rows: [[{ text: '✏️ REQUEST BOT', url: requestBotUrl() }]],
  }),
];

async function sendRandomPromo(chatId) {
  const promo = PROMOS[Math.floor(Math.random() * PROMOS.length)]();
  await api.sendMessage({
    chat_id: chatId,
    parse_mode: 'HTML',
    reply_markup: inlineKeyboard(promo.rows),
    text: promo.text,
  });
}

async function sendAdvertisementCard(chatId) {
  return sendRandomPromo(chatId);
}

async function sendStoredFile(chatId, fileRow) {
  const items = Array.isArray(fileRow.items) && fileRow.items.length > 0
    ? fileRow.items
    : [{ type: fileRow.type || 'document', fileId: fileRow.fileId, name: fileRow.name || '' }];

  await sendDownloadThumbnail(chatId, fileRow);

  const caption = fileRow.caption || downloadCaption();
  let sent = 0;
  for (const item of items) {
    if (!item || !item.fileId) continue;
    const ok = await sendMediaItem(chatId, item, caption);
    if (ok) sent += 1;
  }

  if (sent === 0) {
    await sendUnavailableMessage(chatId, true);
    return;
  }
  await sendRandomPromo(chatId);
}

export async function handleStart(message) {
  if (!message.chat || message.chat.type !== 'private') return false;
  const payload = parseStartPayload(message.text);
  if (payload === null) return false;

  const chatId = message.chat.id;
  try {
    await rememberUser(message);
  } catch (error) {
    console.warn('User save failed', error);
  }

  const checks = await checkRequiredChannels(message.from.id);
  const unverified = checks.filter((entry) => entry.state === 'unverified');
  await reportUnverifiedChannels(unverified);
  const leftChannels = isOwner(message.from)
    ? []
    : checks.filter((entry) => entry.state === 'missing').map((entry) => entry.channel);
  if (leftChannels.length > 0) {
    await sendJoinGate(chatId, payload, leftChannels);
    return true;
  }

  if (!payload || payload === 'start') {
    try {
      await sendSuggestedChannels(message);
    } catch (error) {
      console.warn('Suggested channels failed', error);
    }
    await sendWelcome(chatId);
    return true;
  }

  if (/^download_[A-Za-z0-9_-]+$/.test(payload)) {
    const addonId = payload.slice('download_'.length);
    await api.sendMessage({
      chat_id: chatId,
      parse_mode: 'HTML',
      reply_markup: inlineKeyboard([[{ text: '⚡️ Start Download', url: `https://t.me/MTAddons_BOT?start=getfile_${addonId}` }]]),
      text: [
        `${tgEmoji(EMOJI.DOWN, '⬇️')} <b>Your download is ready!</b>`,
        '',
        `Your targeted add-on package (ID: <code>${escapeHTML(addonId)}</code>) has been successfully verified.`,
        '',
        'Tap the button below to start your installation direct download.',
      ].join('\n'),
    });
    await sendRandomPromo(chatId);
    return true;
  }

  let uuid = null;
  if (UUID_RE.test(payload)) uuid = payload.toLowerCase();
  else if (/^MT-/i.test(payload)) {
    const rest = payload.slice(3);
    if (UUID_RE.test(rest)) uuid = rest.toLowerCase();
    else if (/^MT-[A-Za-z0-9_-]+$/i.test(payload)) {
      await sendOldMovedMessage(chatId, payload);
      return true;
    }
  }

  if (!uuid) {
    await sendUnavailableMessage(chatId, false);
    return true;
  }

  let fileRow = null;
  try {
    fileRow = await db.select().from(files).where(eq(files.uuid, uuid)).get();
  } catch (error) {
    console.warn('File lookup failed', error);
  }

  if (!fileRow) {
    await sendUnavailableMessage(chatId, true);
    return true;
  }

  await sendStoredFile(chatId, fileRow);
  return true;
}
