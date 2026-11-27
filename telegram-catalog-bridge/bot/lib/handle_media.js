import { syncWebsite } from 'lib/web_sync';
import { api, db } from 'sdk';
import { eq } from 'sdk/db';
import { files, uploadSessions, users } from 'schema';
import { CONFIG, EMOJI } from 'lib/config';
import { tgEmoji, escapeHTML, userMention, inlineKeyboard } from 'lib/ui';
import {
  fetchMarketplaceMeta,
  searchMarketplaceByTitle,
  formatMetaTrace,
  collectMarketplaceIdentity,
  cleanMarketplaceTitle,
  extractMarketplaceUuid,
  extractMarketplaceUrl,
} from 'lib/marketplace';

const MAIN_KB = {
  resize_keyboard: true,
  keyboard: [[{ text: 'Finish upload' }, { text: 'Pause upload' }], [{ text: 'Cancel upload' }]],
};

const RESUME_KB = {
  resize_keyboard: true,
  keyboard: [[{ text: 'Resume upload' }]],
};

function isAdmin(user) {
  return Boolean(user && user.id === CONFIG.ADMIN_ID);
}

function getText(message) {
  return String((message && message.text) || '').trim();
}

export function deriveFileBase(name) {
  return String(name || '')
    .replace(/\.(?:mcpack|mcaddon|mctemplate|mcworld|apk|zip)$/i, '')
    .replace(/\s+BY\s+MARKETPLACE\s+TRADER.*$/i, '')
    .trim();
}

export function fileExt(name) {
  const match = /\.([A-Za-z0-9]{1,8})$/.exec(String(name || ''));
  return match ? match[1].toLowerCase() : 'unknown';
}

export function formatSize(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return 'Unknown';
  if (value < 1024) return `${value.toFixed(2)} Bytes`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(2)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(2)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function detectCategory(doc) {
  const name = String((doc && doc.file_name) || '');
  const ext = fileExt(name);
  const size = Number(doc && doc.file_size) || 0;
  const base = deriveFileBase(name).toLowerCase();
  let category = 'Unknown';
  if (ext === 'mcaddon') category = 'ADD-ON';
  else if (ext === 'mcpack') category = size > 0 && size < 1258291 ? 'SKIN PACK' : 'TEXTURE PACK';
  else if (ext === 'mctemplate') category = 'TEMPLATE';
  else if (ext === 'mcworld') category = 'WORLD';
  else if (ext === 'apk') category = 'APPLICATION';
  const actionStuff = base.includes('action') && base.includes('stuff');
  if (actionStuff) category = 'TEXTURE PACK';
  return { category, actionStuff, ext };
}

// Minecraft Bedrock APK filenames carry the game version (Minecraft_v1.21.51.apk,
// minecraft-1-21-51.apk, ...). Trim it and normalise the separators to dots.
export function extractApkVersion(name) {
  const match = /v?(\d+(?:[.\-_]\d+){1,3})/.exec(String(name || '').replace(/\.apk$/i, ''));
  if (!match) return null;
  return match[1].replace(/[.\-_]+/g, '.');
}

export function normalizeCategoryName(value) {
  const raw = String(value || '').trim().toUpperCase().replace(/[\u2013\u2014]/g, '-');
  if (!raw) return '';
  if (raw === 'MASH UP' || raw === 'MASHUP' || raw === 'MASH-UP') return 'MASHUP PACK';
  if (raw === 'SKIN') return 'SKIN PACK';
  if (raw === 'TEXTURE' || raw === 'RESOURCE') return 'TEXTURE PACK';
  if (raw === 'WORLD' || raw === 'MAP') return 'WORLD';
  if (raw === 'APPLICATION' || raw === 'APK') return 'APPLICATION';
  if (raw === 'ADD ON' || raw === 'ADDON' || raw === 'ADD-ON') return 'ADD-ON';
  return raw;
}

export function marketplaceCategory(session, list, detected) {
  // 1) Admin typed a category explicitly via /handle_media <link> <category> — human intent wins.
  const explicit = normalizeCategoryName(session && session.category);
  if (explicit && explicit !== 'UNKNOWN') return explicit;

  // 2) The Marketplace link's metadata is the source of truth for the type. File properties
  //    (extension, size) never override it — this is what stops a small .mcpack texture pack
  //    from being relabelled SKIN PACK and routed to the skin channel.
  const fromMeta = normalizeCategoryName(session && session.requestedMeta ? session.requestedMeta.category : null);
  if (fromMeta && fromMeta !== 'UNKNOWN') return fromMeta;

  // 3) Link-derived title hint, for pages that carry a name but no category field.
  if (/mash[-\s]?up|mashup/i.test(String((session && session.title) || ''))) return 'MASHUP PACK';

  // 4) Last resort ONLY (every metadata source unreachable): the old file-size heuristic, so a
  //    skin pack can still reach the skin channel. Dead metadata means this is a guess, never a fact.
  if (detected && detected.category) return detected.category;
  return 'Unknown';
}

export function uploadSizeDisplay(list, primary) {
  const items = Array.isArray(list) && list.length > 0 ? list : primary ? [primary] : [];
  const total = items.reduce((sum, item) => sum + (Number(item.size) || 0), 0);
  return formatSize(total);
}

export function getMediaFile(message) {
  if (message && message.document) return { type: 'document', doc: message.document };
  if (message && message.video) return { type: 'video', doc: message.video };
  return null;
}

export function isSyntheticTestFileId(fileId) {
  const value = String(fileId || '');
  return /^BQAC_TEST/.test(value) || /^TEST/.test(value) || value.includes('_TEST');
}

export function mergeMedia(list, incoming) {
  const existing = Array.isArray(list) ? list : [];
  const filtered = existing.filter((item) => item.fileId !== incoming.fileId);
  return [...filtered, incoming].slice(-5);
}

export function mediaTally(list) {
  const items = Array.isArray(list) ? list : [];
  const photos = items.filter((item) => item.type === 'photo').length;
  const others = items.length - photos;
  return `${tgEmoji('5391032818111363540', '📍')} Photos: ${photos}  •  ${tgEmoji('5305265301917549162', '📎')} Files: ${others}`;
}

function sessionFiles(session) {
  return Array.isArray(session && session.files) ? session.files : [];
}

function selectedChannels(session) {
  if (session && Array.isArray(session.selectedChannels) && session.selectedChannels.length > 0) {
    return session.selectedChannels;
  }
  return [CONFIG.MAIN_CHANNEL_ID];
}

export function targetChannelsFor(session, finalCategory, detected) {
  // Skin packs always go to the skin channel — regardless of studio, per the owner's routing spec.
  if (finalCategory === 'SKIN PACK') return [CONFIG.SKIN_CHANNEL_ID];
  const creator = String((session && session.creator) || '').toLowerCase();
  if (creator.includes('honeyfrost')) return [CONFIG.RL_CRAFT_CHANNEL_ID];
  if (creator.includes('orville') || creator.includes('oreville')) return [CONFIG.ACTION_CHANNEL_ID];
  if (finalCategory === 'APPLICATION' || (detected && detected.ext === 'apk')) return [CONFIG.BEDROCK_CHANNEL_ID];
  // The channel-selection panel no longer influences routing: the Marketplace link decides.
  return [CONFIG.MAIN_CHANNEL_ID];
}

async function getSession(userId) {
  return db.select().from(uploadSessions).where(eq(uploadSessions.userId, userId)).get();
}

async function saveSession(userId, data) {
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
    requestedBy: null,
    requestedByUserId: null,
    status: null,
    marketplaceUrl: null,
    thumbnailUrl: null,
    title: null,
    creator: null,
    selectedChannels: data && data.selectedChannels ? data.selectedChannels : [CONFIG.MAIN_CHANNEL_ID],
    mediaId: null,
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

async function deleteSession(userId) {
  await db.delete(uploadSessions).where(eq(uploadSessions.userId, userId)).run();
}

export function parseCommandIdentity(message) {
  const text = getText(message);
  const stripped = text.replace(/^\/(?:handle_media|handl_media)(?:@\w+)?\s*/i, '').trim();
  const uuid = extractMarketplaceUuid(stripped);
  const url = extractMarketplaceUrl(stripped);
  const category = stripped
    .replace(uuid || '', '')
    .replace(url || '', '')
    .trim();
  return { uuid, url, category: category || null };
}

async function enrichIdentity(uuid, url) {
  try {
    return await fetchMarketplaceMeta(uuid, url);
  } catch {
    return { uuid, marketplaceUrl: url, _trace: [{ src: 'enrich', result: 'err', ms: 0 }] };
  }
}

async function sendNeedLink(chatId, fileStored, title) {
  const lines = [
    `${tgEmoji(EMOJI.WARNING, '⚠️')} <b>Marketplace link required</b>`,
    '',
  ];
  if (fileStored) lines.push(`${tgEmoji(EMOJI.CHECK, '✔️')} File is saved temporarily.`);
  if (title) lines.push(`I searched for: <b>${escapeHTML(title)}</b> but could not confirm the Marketplace page.`);
  lines.push('');
  lines.push('Send exact Marketplace title, URL, or UUID for this file.');
  lines.push('');
  lines.push('<b>Accepted:</b>');
  lines.push('<code>9decf443-ead0-49ae-bb89-19888aa054fa</code>');
  lines.push('<code>https://www.minecraft.net/en-us/marketplace/pdp?id=9decf443-ead0-49ae-bb89-19888aa054fa</code>');
  lines.push('');
  lines.push(`${tgEmoji(EMOJI.CROSS, '❌')} Random UUIDs are disabled to prevent junk records.`);
  await api.sendMessage({
    chat_id: chatId,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: MAIN_KB,
    text: lines.join('\n'),
  });
}

async function showStatus(message, session) {
  const list = sessionFiles(session);
  const lines = [`${tgEmoji(EMOJI.CHECK, '✔️')} <b>Media session is active.</b>`, ''];
  if (session.uuid) {
    lines.push(`${tgEmoji(EMOJI.ID, 'ℹ️')} Marketplace UUID: <code>${escapeHTML(session.uuid)}</code>`);
  } else {
    lines.push(`${tgEmoji(EMOJI.WARNING, '⚠️')} Waiting for Marketplace link/UUID.`);
  }
  if (session.marketplaceUrl) {
    lines.push(`${tgEmoji(EMOJI.LINK, '🔗')} Marketplace URL:`);
    lines.push(escapeHTML(session.marketplaceUrl));
  }
  if (session.title) lines.push(`Title: <b>${escapeHTML(session.title)}</b>`);
  lines.push(mediaTally(list));
  lines.push('');
  lines.push('Send file or Marketplace link. It finalizes automatically when both exist.');
  await api.sendMessage({
    chat_id: message.chat.id,
    parse_mode: 'HTML',
    reply_markup: session.paused ? RESUME_KB : MAIN_KB,
    text: lines.join('\n'),
  });
}

export async function startHandleMedia(message) {
  const identity = parseCommandIdentity(message);
  const userId = message.from.id;
  let session = await getSession(userId);
  if (!session) session = await saveSession(userId, { category: identity.category });

  if (identity.uuid) {
    const meta = await enrichIdentity(identity.uuid, identity.url);
    session = await saveSession(userId, {
      uuid: identity.uuid,
      category: identity.category || session.category,
      marketplaceUrl: meta.marketplaceUrl || identity.url,
      thumbnailUrl: meta.thumbnailUrl || null,
      title: meta.title || null,
      creator: meta.creator || null,
      requestedMeta: {
        version: meta.version || null,
        priceCoins: meta.priceCoins || null,
        priceDollar: meta.priceDollar || null,
        category: meta.category || null,
      },
    });
    const lines = [
      `${tgEmoji(EMOJI.CHECK, '✔️')} <b>Marketplace link saved</b>`,
      '',
      `${tgEmoji(EMOJI.ID, 'ℹ️')} UUID:`,
      `<code>${escapeHTML(identity.uuid)}</code>`,
      '',
    ];
    if (session.title) lines.push(`Title: <b>${escapeHTML(session.title)}</b>`);
    lines.push(session.thumbnailUrl
      ? `${tgEmoji(EMOJI.CHECK, '✔️')} Marketplace thumbnail found.`
      : `${tgEmoji(EMOJI.WARNING, '⚠️')} Thumbnail not found; text post fallback will be used.`);
    lines.push('');
    lines.push('Now send the file.');
    await api.sendMessage({
      chat_id: message.chat.id,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: MAIN_KB,
      text: lines.join('\n'),
    });
    return true;
  }

  await showStatus(message, session);
  return true;
}

export function extractDlcVersion(...candidates) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const match = /(?:^|\b)v?(\d+(?:\.\d+)*)(?:\b|$)/.exec(String(candidate));
    if (match) return match[1];
  }
  return '';
}

export function versionKey(version) {
  const parts = String(version || '')
    .split('.')
    .map((part) => {
      const digits = part.replace(/\D/g, '');
      return digits === '' ? null : Number(digits);
    })
    .filter((part) => part !== null);
  while (parts.length > 1 && parts[parts.length - 1] === 0) parts.pop();
  return parts.join('.');
}

function sessionVersion(session, fileName) {
  const meta = session && session.requestedMeta ? session.requestedMeta : {};
  return extractDlcVersion(meta.version, session && session.version, session && session.title, fileName);
}

function sessionPriceLine(session) {
  const meta = session && session.requestedMeta ? session.requestedMeta : {};
  const parts = [];
  if (meta.priceCoins) parts.push(`${meta.priceCoins} Minecoins`);
  if (meta.priceDollar) parts.push(`${meta.priceDollar}`);
  return parts.join(' / ');
}

export function publicMessageLink(chatId, sent) {
  if (typeof chatId !== 'string' || !chatId.startsWith('@')) return '';
  if (!sent || !sent.message_id) return '';
  return `https://t.me/${chatId.slice(1)}/${sent.message_id}`;
}

const CAT_TAGS = {
  'ADD-ON': '#Mt_Addon',
  TEMPLATE: '#Mt_Template',
  'SKIN PACK': '#Mt_Skinpack',
  'TEXTURE PACK': '#Mt_Texturepack',
  WORLD: '#Mt_World',
  APPLICATION: '#Mt_Application',
};

function catTag(category) {
  return CAT_TAGS[category] || '#Minecraft';
}

export function buildCaption(session, finalCategory, fileName, ext, sizeDisplay) {
  // APK posts are named after the Minecraft version trimmed from the apk filename
  // (Minecraft_v1.21.51.apk -> "Minecraft 1.21.51"); every other post takes its name from the
  // Marketplace link, with the cleaned filename only as a last resort.
  const apkVersion = ext === 'apk' ? extractApkVersion(fileName) : null;
  const name = apkVersion
    ? `Minecraft ${apkVersion}`
    : (session.title || cleanMarketplaceTitle(fileName) || 'Unknown');
  const creator = session.creator || 'Marketplace trader';
  const version = apkVersion || sessionVersion(session, fileName);
  const price = sessionPriceLine(session);
  const profile = [
    `${finalCategory} PROFILE:`,
    `→ Name: ${escapeHTML(name)}`,
    `→ Studio: ${escapeHTML(creator)}`,
    `→ Category: ${escapeHTML(finalCategory)}`,
  ];
  if (version) profile.push(`→ Version: ${escapeHTML(version)}`);
  if (price) profile.push(`→ Price: ${escapeHTML(price)}`);
  profile.push(`→ File type: .${escapeHTML(ext)}`);
  profile.push(`→ File size: ${escapeHTML(sizeDisplay)}`);
  if (session.marketplaceUrl) profile.push(`→ Marketplace: ${escapeHTML(session.marketplaceUrl)}`);
  if (session.uuid) profile.push(`→ UUID: ${escapeHTML(session.uuid)}`);
  profile.push(`→ Tags: #marketplace_trader ${catTag(finalCategory)}`);

  return [
    `𝗗𝗟𝗖 𝗡𝗔𝗠𝗘: ${escapeHTML(name)}`,
    '𝗠𝗢𝗥𝗘 𝗜𝗡𝗙𝗢: ',
    `<blockquote expandable>${profile.join('\n')}</blockquote>`,
    `𝗥𝗘𝗤𝗨𝗘𝗦𝗧𝗘𝗗 𝗕𝗬: ${requesterHtml(session)}`,
    // Hyperlink embedded inside the bold sentence (owner: "link inside the normal text").
    `𝗙𝗼𝗿 𝗺𝗼𝗿𝗲 𝗮𝗱𝗱-𝗼𝗻 𝘀𝘁𝘂𝗳𝗳 𝗷𝗼𝗶𝗻 <a href="https://t.me/marketplace_trader">𝗺𝗮𝗿𝗸𝗲𝘁𝗽𝗹𝗮𝗰𝗲 𝘁𝗿𝗮𝗱𝗲𝗿</a>`,
  ].join('\n');
}

export function parseRequester(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  if (/^(skip|none|no requester)$/i.test(raw)) return { name: 'None', userId: null };
  const idMatch = /\b(\d{5,15})\b/.exec(raw);
  if (idMatch) {
    const userId = Number(idMatch[1]);
    const name = raw.replace(idMatch[1], '').trim();
    return { name: name || idMatch[1], userId };
  }
  return { name: raw, userId: null };
}

function telegramName(user) {
  if (!user) return null;
  const full = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  if (full) return full;
  if (user.username) return `@${user.username}`;
  return null;
}

async function resolveRequester(parsed) {
  if (!parsed || !parsed.userId || parsed.name !== String(parsed.userId)) return parsed;
  try {
    const row = await db.select().from(users).where(eq(users.id, parsed.userId)).get();
    if (row && row.firstName) return { ...parsed, name: row.firstName };
    if (row && row.username) return { ...parsed, name: row.username };
  } catch {
    return parsed;
  }
  try {
    const chat = await api.getChat({ chat_id: parsed.userId });
    const name = telegramName(chat);
    if (name) return { ...parsed, name };
  } catch {
    return parsed;
  }
  try {
    const member = await api.getChatMember({ chat_id: CONFIG.MAIN_CHANNEL_ID, user_id: parsed.userId });
    const name = telegramName(member && member.user);
    if (name) return { ...parsed, name };
  } catch {
    return parsed;
  }
  return parsed;
}

export function requesterHtml(session) {
  if (!session) return 'None';
  if (session.requestedByUserId && session.requestedBy) {
    return userMention(session.requestedByUserId, session.requestedBy);
  }
  if (session.requestedBy) return escapeHTML(session.requestedBy);
  return 'None';
}

async function askRequester(message, session) {
  await saveSession(message.from.id, { ...session, status: 'awaiting_requester' });
  await api.sendMessage({
    chat_id: message.chat.id,
    parse_mode: 'HTML',
    reply_markup: MAIN_KB,
    text: [
      `${tgEmoji(EMOJI.PENCIL, '✏️')} <b>Requester info needed</b>`,
      '',
      "Send requester's Telegram ID, @username, or name.",
      'Or press <b>Finish upload</b> to post without requester.',
      '',
      '<b>Examples:</b>',
      '<code>6185846289</code>',
      '<code>6185846289 Alex</code>',
      '<code>@username</code>',
      '<code>Skip</code>',
    ].join('\n'),
  });
}

async function setRequesterAndFinish(message, session) {
  const parsed = parseRequester(getText(message));
  if (!parsed) {
    await askRequester(message, session);
    return;
  }
  const resolved = await resolveRequester(parsed);
  const updated = await saveSession(message.from.id, {
    requestedBy: resolved.name,
    requestedByUserId: resolved.userId,
    status: 'ready',
  });
  await finishUpload(message, updated);
}

async function finishUpload(message, session) {
  const userId = message.from.id;
  const chatId = message.chat.id;
  const list = sessionFiles(session);

  const primary = list.filter((item) => item.type === 'document' || item.type === 'video').pop();
  const primaryExt = primary ? fileExt(primary.name) : '';
  if (!session.uuid && primaryExt !== 'apk') {
    await sendNeedLink(chatId, list.length > 0, null);
    return;
  }
  if (!primary) {
    await api.sendMessage({
      chat_id: chatId,
      parse_mode: 'HTML',
      text: `${tgEmoji(EMOJI.CROSS, '❌')} No file uploaded. Send the file first.`,
    });
    return;
  }
  if (isSyntheticTestFileId(primary.fileId)) {
    await api.sendMessage({
      chat_id: chatId,
      parse_mode: 'HTML',
      text: `${tgEmoji(EMOJI.CROSS, '❌')} Test file IDs are ignored and cannot overwrite production files. Please upload the real Telegram file.`,
    });
    return;
  }

  let current = session;
  let enrichTrace = '';
  if (current.uuid && (!current.thumbnailUrl || !current.title)) {
    const meta = await enrichIdentity(current.uuid, current.marketplaceUrl);
    enrichTrace = formatMetaTrace(meta);
    current = await saveSession(userId, {
      thumbnailUrl: current.thumbnailUrl || meta.thumbnailUrl || null,
      title: current.title || meta.title || null,
      creator: current.creator || meta.creator || null,
      marketplaceUrl: current.marketplaceUrl || meta.marketplaceUrl || null,
      requestedMeta: current.requestedMeta || {
        version: meta.version || null,
        priceCoins: meta.priceCoins || null,
        priceDollar: meta.priceDollar || null,
        category: meta.category || null,
      },
    });
  }

  const detected = detectCategory(primary.doc);
  const apkPost = Boolean(detected && detected.ext === 'apk');
  const finalCategory = marketplaceCategory(current, list, detected);
  const fileName = primary.name || current.name || 'Unknown';
  const ext = fileExt(fileName);
  const sizeDisplay = uploadSizeDisplay(list, primary);
  const caption = buildCaption(current, finalCategory, fileName, ext, sizeDisplay);
  // APK posts carry no delivery deep-link (there is no Marketplace UUID): SUGGEST button only.
  const markup = apkPost
    ? inlineKeyboard([
      [{ text: '✏️ SUGGEST AN ADD-ON', url: CONFIG.REQUEST_BOT_URL }],
    ])
    : inlineKeyboard([
      [{ text: '⬇️ DOWNLOAD', url: `https://t.me/${CONFIG.BOT_USERNAME}?start=MT-${encodeURIComponent(current.uuid)}` }],
      [{ text: '✏️ SUGGEST AN ADD-ON', url: CONFIG.REQUEST_BOT_URL }],
    ]);

  const targets = [chatId, ...targetChannelsFor(current, finalCategory, detected)];
  let posted = 0;
  let firstPublicLink = '';

  // Post the first target (the admin's own chat) with the remote thumbnail URL, keep the file_id
  // Telegram returns, then reuse that file_id for every channel: passing the URL per target made
  // Telegram re-download the same ~70KB image once per channel. Channels go out in parallel; each
  // task catches its own error so one restricted channel cannot block the others, and results keep
  // target order so firstPublicLink still points at the first channel that succeeded.
  const sendCaptionTo = (target, photo) => (photo
    ? api.sendPhoto({ chat_id: target, photo, caption, parse_mode: 'HTML', reply_markup: markup })
    : api.sendMessage({
      chat_id: target,
      text: caption,
      parse_mode: 'HTML',
      reply_markup: markup,
      // Degraded posts (no thumbnail) carry the marketplace URL inside the caption blockquote, and
      // minecraft.net renders product pages client-side, so Telegram's auto preview was always the
      // generic creeper banner — a wrong image attached to the pack. Suppress it; photo posts are unaffected.
      link_preview_options: { is_disabled: true },
    }));

  const [firstTarget, ...restTargets] = targets;
  let thumbFileId = null;
  // .apk uploads post with the fixed Minecraft banner photo instead of a Marketplace thumbnail.
  const apkPhoto = CONFIG.APK_PHOTO_FILE_ID;

  if (firstTarget !== undefined) {
    try {
      const sent = await sendCaptionTo(firstTarget, apkPost ? apkPhoto : (current.thumbnailUrl || null));
      posted += 1;
      const photos = sent && sent.photo;
      if (Array.isArray(photos) && photos.length) thumbFileId = photos[photos.length - 1].file_id || null;
      const link = publicMessageLink(firstTarget, sent);
      if (link) firstPublicLink = link;
    } catch (error) {
      console.warn('post failed', firstTarget, error && error.message);
    }
  }

  if (restTargets.length) {
    const results = await Promise.all(restTargets.map(async (target) => {
      try {
        const sent = await sendCaptionTo(target, apkPost ? apkPhoto : (thumbFileId || current.thumbnailUrl || null));
        return { target, sent };
      } catch (error) {
        console.warn('post failed', target, error && error.message);
        return null;
      }
    }));
    for (const result of results) {
      if (!result) continue;
      posted += 1;
      if (!firstPublicLink) {
        const link = publicMessageLink(result.target, result.sent);
        if (link) firstPublicLink = link;
      }
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const items = list.map((item) => ({
    type: item.type,
    fileId: item.fileId,
    name: item.name,
    size: item.size,
  }));
  const version = sessionVersion(current, fileName);

  const row = {
    uuid: current.uuid || `apk-${extractApkVersion(fileName) || 'unknown'}-${now}`,
    fileId: primary.fileId,
    type: primary.type,
    category: finalCategory,
    name: fileName,
    items,
    caption: `${tgEmoji(EMOJI.DIAMOND, '💎')} <a href="${CONFIG.ADDLIST_URL}"><b>𝙎𝙐𝘽𝙎𝘾𝙍𝙄𝘽𝙀 𝙏𝙊 𝘼𝙇𝙇 𝘾𝙃𝘼𝙉𝙉𝙀𝙇𝙎</b></a>`,
    marketplaceUrl: current.marketplaceUrl || null,
    thumbnailUrl: current.thumbnailUrl || null,
    title: current.title || fileName,
    creator: current.creator || null,
    messageLink: firstPublicLink || null,
    version: version || null,
    versionKey: version ? versionKey(version) : null,
    updatedAt: now,
  };

  const existing = await db.select().from(files).where(eq(files.uuid, current.uuid)).get();
  if (existing) {
    await db.update(files).set(row).where(eq(files.uuid, current.uuid)).run();
  } else {
    await db.insert(files).values(row).run();
  }

  // A website outage must never stop the existing upload workflow.
  const websiteSynced = await syncWebsite(row);
  await deleteSession(userId);

  const lines = [
    `${tgEmoji(EMOJI.CHECK, '✔️')} <b>Upload finished!</b>`,
    ...(websiteSynced ? [] : ['Website sync failed or this item is unsupported. Run /websync later.']),
    '',
    `${tgEmoji(EMOJI.ID, 'ℹ️')} Marketplace UUID:`,
    `<code>${escapeHTML(current.uuid)}</code>`,
    '',
    apkPost
      ? `${tgEmoji(EMOJI.CHECK, '✔️')} APK banner photo used.`
      : current.thumbnailUrl
        ? `${tgEmoji(EMOJI.CHECK, '✔️')} Marketplace thumbnail used.`
        : `${tgEmoji(EMOJI.WARNING, '⚠️')} Marketplace thumbnail unavailable; text post used.`,
    // Admin-only diagnostic: which metadata source failed inside the Telegram runtime and how,
    // so a runtime-side outage or fetch quirk is visible instead of silent.
    ...(enrichTrace ? [` ${escapeHTML(enrichTrace)}`] : []),
    ...(current.uuid ? ['Saved link:', `https://t.me/${CONFIG.BOT_USERNAME}?start=MT-${encodeURIComponent(current.uuid)}`] : []),
  ];
  if (firstPublicLink) {
    lines.push('Channel post:');
    lines.push(escapeHTML(firstPublicLink));
  }
  lines.push('');
  lines.push(`Posted targets: <b>${posted}</b>/<b>${targets.length}</b>`);

  await api.sendMessage({
    chat_id: chatId,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: { remove_keyboard: true },
    text: lines.join('\n'),
  });
}

async function createOrUpdateSessionFromIdentity(message, identity, session, preloadedMeta) {
  // preloadedMeta: the caller already parsed this exact product page (filename/title search), so
  // re-fetching it through the candidate ladder duplicated ~530ms and ~1MB per auto-matched upload.
  const meta = preloadedMeta && preloadedMeta.uuid ? preloadedMeta : await enrichIdentity(identity.uuid, identity.url);
  return saveSession(message.from.id, {
    ...session,
    uuid: identity.uuid,
    marketplaceUrl: meta.marketplaceUrl || identity.url || session.marketplaceUrl,
    thumbnailUrl: meta.thumbnailUrl || session.thumbnailUrl || null,
    title: meta.title || session.title || null,
    creator: meta.creator || session.creator || null,
    requestedMeta: {
      version: meta.version || null,
      priceCoins: meta.priceCoins || null,
      priceDollar: meta.priceDollar || null,
      category: meta.category || null,
    },
  });
}

async function collectFile(message, session, media) {
  const doc = media.doc;
  const base = deriveFileBase(doc.file_name);
  const list = sessionFiles(session);
  const item = {
    type: media.type,
    fileId: doc.file_id,
    name: doc.file_name || 'addon',
    size: Number(doc.file_size) || 0,
  };
  const updated = await saveSession(message.from.id, {
    ...session,
    files: mergeMedia(list, item),
    name: session.name || base,
  });

  const receivedExt = fileExt(doc.file_name);
  if (receivedExt === 'apk') {
    // APKs have no Minecraft Marketplace page: never slug-search for one and never demand a
    // link. Ack immediately with the trimmed version and point at Finish upload.
    const apkV = extractApkVersion(doc.file_name);
    await api.sendMessage({
      chat_id: message.chat.id,
      parse_mode: 'HTML',
      reply_markup: MAIN_KB,
      text: `${tgEmoji(EMOJI.LIGHTNING, '⚡')} APK received${apkV ? `: <b>Minecraft ${escapeHTML(apkV)}</b>` : ''}. Press <b>Finish upload</b> to post it to the Bedrock channel.`,
    });
    return;
  }

  if (updated.status === 'awaiting_requester') {
    // Multi-file uploads keep adding files while the requester prompt is open — but silently
    // swallowing the message made a stale awaiting-requester session look like a dead bot
    // (owner sent two apks, got nothing). Always acknowledge the added file.
    await api.sendMessage({
      chat_id: message.chat.id,
      parse_mode: 'HTML',
      reply_markup: MAIN_KB,
      text: `${tgEmoji(EMOJI.CHECK, '✔️')} File added to the current upload: ${escapeHTML(doc.file_name || 'file')}. Send requester info or press Finish upload — or Cancel upload to start fresh.`,
    });
    return;
  }

  const identity = collectMarketplaceIdentity(message);
  if (identity.uuid) {
    const bound = await createOrUpdateSessionFromIdentity(message, identity, updated);
    await askRequester(message, bound);
    return;
  }

  if (updated.uuid) {
    await askRequester(message, updated);
    return;
  }

  const meta = await searchMarketplaceByTitle(doc.file_name || base);
  if (meta && meta.uuid) {
    const bound = await createOrUpdateSessionFromIdentity(message, { uuid: meta.uuid, url: meta.sourceUrl }, updated, meta);
    await askRequester(message, bound);
    return;
  }

  await sendNeedLink(message.chat.id, true, meta && meta.searchTitle ? meta.searchTitle : null);
}

async function bindTitleMessage(message, session, titleText) {
  const meta = await searchMarketplaceByTitle(titleText);
  if (!meta || !meta.uuid) {
    await sendNeedLink(message.chat.id, sessionFiles(session).length > 0, meta && meta.searchTitle ? meta.searchTitle : null);
    return;
  }
  const bound = await createOrUpdateSessionFromIdentity(message, { uuid: meta.uuid, url: meta.sourceUrl }, session, meta);
  await askRequester(message, bound);
}

async function bindLinkMessage(message, session, identity) {
  const bound = await createOrUpdateSessionFromIdentity(message, identity, session);
  if (sessionFiles(bound).length > 0) {
    await askRequester(message, bound);
    return;
  }
  const lines = [
    `${tgEmoji(EMOJI.CHECK, '✔️')} Marketplace link saved. Now send the file.`,
    '',
    `${tgEmoji(EMOJI.ID, 'ℹ️')} UUID: <code>${escapeHTML(bound.uuid)}</code>`,
  ];
  if (bound.thumbnailUrl) lines.push(`${tgEmoji(EMOJI.CHECK, '✔️')} Thumbnail found.`);
  await api.sendMessage({
    chat_id: message.chat.id,
    parse_mode: 'HTML',
    reply_markup: MAIN_KB,
    text: lines.join('\n'),
  });
}

export async function handleMedia(message) {
  if (!message.chat || message.chat.type !== 'private') return false;
  if (!isAdmin(message.from)) return false;
  const text = getText(message);
  if (/^\/start(?:@\w+)?(?:\s|$)/i.test(text)) return false;
  if (/^\/(?:handle_media|handl_media)(?:@\w+)?(?:\s|$)/i.test(text)) {
    return startHandleMedia(message);
  }

  const userId = message.from.id;
  let session = await getSession(userId);

  if (text === 'Cancel upload' || /^\/cancelupload(?:@\w+)?$/i.test(text)) {
    await deleteSession(userId);
    await api.sendMessage({
      chat_id: message.chat.id,
      parse_mode: 'HTML',
      reply_markup: { remove_keyboard: true },
      text: `${tgEmoji(EMOJI.CROSS, '❌')} Upload cancelled.`,
    });
    return true;
  }

  if (text === 'Pause upload') {
    if (!session || sessionFiles(session).length === 0) return false;
    await saveSession(userId, { paused: 1 });
    await api.sendMessage({
      chat_id: message.chat.id,
      parse_mode: 'HTML',
      reply_markup: RESUME_KB,
      text: `${tgEmoji('5359543311897998264', '⏸')} Upload paused.`,
    });
    return true;
  }

  if (text === 'Resume upload') {
    if (!session || sessionFiles(session).length === 0) return false;
    await saveSession(userId, { paused: 0 });
    await api.sendMessage({
      chat_id: message.chat.id,
      parse_mode: 'HTML',
      reply_markup: MAIN_KB,
      text: `${tgEmoji('5348125953090403204', '▶️')} Upload resumed.`,
    });
    return true;
  }

  const media = getMediaFile(message);
  if (media) {
    if (!session) session = await saveSession(userId, {});
    await collectFile(message, session, media);
    return true;
  }

  if (text === 'Finish upload') {
    if (!session) {
      await api.sendMessage({
        chat_id: message.chat.id,
        parse_mode: 'HTML',
        text: `${tgEmoji(EMOJI.CROSS, '❌')} No file uploaded. Send the file first.`,
      });
      return true;
    }
    const ready = await saveSession(userId, {
      requestedBy: session.requestedBy || 'None',
      status: 'ready',
    });
    await finishUpload(message, ready);
    return true;
  }

  if (!session || sessionFiles(session).length === 0) return false;

  if (session.paused) {
    await api.sendMessage({
      chat_id: message.chat.id,
      parse_mode: 'HTML',
      reply_markup: RESUME_KB,
      text: `${tgEmoji('5359543311897998264', '⏸')} Upload is paused. Resume to continue.`,
    });
    return true;
  }

  if (text && !text.startsWith('/') && session.status === 'awaiting_requester') {
    await setRequesterAndFinish(message, session);
    return true;
  }

  const identity = collectMarketplaceIdentity(message);
  if (identity.uuid) {
    await bindLinkMessage(message, session, identity);
    return true;
  }

  if (text && !text.startsWith('/') && !session.uuid) {
    await bindTitleMessage(message, session, text);
    return true;
  }

  return false;
}
