export function tgEmoji(emojiId, fallback) {
  return `<tg-emoji emoji-id="${emojiId}">${fallback}</tg-emoji>`;
}

export function escapeHTML(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function userMention(userId, name) {
  const label = escapeHTML(name || 'Telegram User');
  return `<a href="tg://user?id=${userId}">${label}</a>`;
}

const LINK_ICON = '5271604874419647061';
const CHECK_ICON = '5206607081334906820';
const CROSS_ICON = '5210952531676504517';
const TRASH_ICON = '5445267414562389170';
const LIGHTNING_ICON = '5456140674028019486';
const DOWNLOAD_ICON = '5443127283898405358';
const DOWN_ARROW_ICON = '5406745015365943482';
const CHAT_ICON = '5443038326535759644';
const PENCIL_ICON = '5395444784611480792';
const SEARCH_ICON = '5197288647275071607';
const WEB_ICON = '6260006084795178106';

const STRIP_SET = new Set([
  '✅', '❌', '🗑', '⚡', '🔥', '⬇', '✉', '✨', '🛡', '✏', '💬', '📥', '📤',
  '🔗', '🌐', '▶', '⛔', '🚀', '🧩', '🎲', '📌', '🗂', '🧰', '📣', '📦', '🔍',
  '🏆', '💎', '🔔', '🔽', '❗', '⚠', '🎉', '👀', '✖', '✔', '\uFE0F',
]);

export function wellFormed(value) {
  const text = String(value === null || value === undefined ? '' : value);
  if (typeof text.isWellFormed === 'function' && text.isWellFormed()) return text;
  return text.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '');
}

function stripButtonText(text) {
  const chars = Array.from(String(text || ''));
  return wellFormed(chars.filter((char) => !STRIP_SET.has(char)).join('').replace(/\s+/g, ' ').trim());
}

let markupDisabled = false;

export function setMarkupDisabled(value) {
  markupDisabled = Boolean(value);
}

export function isMarkupError(error) {
  const message = String((error && error.message) || '');
  return /InlineKeyboardButton|KeyboardButton|reply_markup|inline_keyboard/i.test(message);
}

export function plainButtonText(button) {
  const text = button && button.text;
  if (typeof text === 'string') return text.trim();
  if (typeof text === 'number' || typeof text === 'boolean') return String(text);
  return '';
}

function decorateButton(button, options) {
  const plain = Boolean(options && options.plain);
  const source = button && typeof button === 'object' ? button : {};
  const raw = wellFormed(plainButtonText(source));
  const rawTrim = raw;
  let text = stripButtonText(raw);
  let style = 'primary';
  let icon = LINK_ICON;

  if (raw.includes('✅') || /\b(done|finish|all|send to channel|yes)\b/i.test(text)) {
    style = 'success';
    icon = CHECK_ICON;
  }
  if (raw.includes('❌') || raw.includes('🗑') || /\b(cancel|close|delete|don.t send|don’t send|reject|remove)\b/i.test(text)) {
    style = 'danger';
    icon = /\b(delete|close)\b/i.test(text) ? TRASH_ICON : CROSS_ICON;
  }
  if (/\b(upload|start download)\b/i.test(text)) {
    style = 'success';
    icon = /download/i.test(text) ? DOWNLOAD_ICON : LIGHTNING_ICON;
  }
  if (/\b(group chat)\b/i.test(text)) icon = CHAT_ICON;
  if (/\b(request|suggest)\b/i.test(text)) icon = PENCIL_ICON;
  if (/\b(search bot)\b/i.test(text)) icon = SEARCH_ICON;
  if (/\b(channel|old file|open|join)\b/i.test(text)) icon = DOWNLOAD_ICON;
  if (/\bwebapp\b/i.test(text)) {
    style = 'success';
    icon = WEB_ICON;
  }
  // Legacy channel-post metadata (uploads/_handle_media.txt:813-828): DOWNLOAD was danger + down-arrow,
  // SUGGEST AN ADD-ON was success + pencil. Anchored so "Start Download" keeps its own styling.
  if (/\bsuggest\b/i.test(text)) {
    style = 'success';
    icon = PENCIL_ICON;
  }
  if (/^download$/i.test(text)) {
    style = 'danger';
    icon = DOWN_ARROW_ICON;
  }
  if (rawTrim.startsWith('✅')) {
    style = 'success';
    icon = CHECK_ICON;
  }
  if (rawTrim.startsWith('❌')) {
    style = 'danger';
    icon = CROSS_ICON;
  }

  if (rawTrim.startsWith('✅') && !/\b(accept|done|all|finish|send to channel|yes|valid)\b/i.test(text)) {
    text = `Selected ${text}`;
  }
  if (rawTrim.startsWith('❌') && !/\b(reject|cancel|close|delete|remove|none|hide|different|not looking)\b/i.test(text)) {
    text = `Off ${text}`;
  }

  const label = wellFormed((text || '').slice(0, 64).trim()) || 'Open';
  if (plain) {
    const bare = { text: label };
    if (source.url) bare.url = source.url;
    if (source.callback_data) bare.callback_data = source.callback_data;
    if (source.web_app) bare.web_app = source.web_app;
    return bare;
  }
  return { ...source, text: label, style, icon_custom_emoji_id: icon };
}

export function inlineKeyboard(rows, options) {
  if (markupDisabled) return undefined;
  const built = (Array.isArray(rows) ? rows : [])
    .map((row) => (Array.isArray(row) ? row : [row]).map((button) => decorateButton(button, options)))
    .filter((row) => row.length > 0);
  if (built.length === 0) return undefined;
  return { inline_keyboard: built };
}
