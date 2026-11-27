import { api } from 'sdk';
import { CONFIG, EMOJI } from 'lib/config';
import { tgEmoji, escapeHTML } from 'lib/ui';

const WINDOW_MS = 10 * 60 * 1000;
const lastSent = new Map();

export function resetDiagnostics() {
  lastSent.clear();
  lastText = '';
  lastTextAt = 0;
}

import { fetch as sdkFetch } from 'sdk';

export async function runFetchDiagnostics() {
  const out = [`setTimeout:${typeof setTimeout}`, `sdkfetch:${typeof sdkFetch}`, `globalfetch:${typeof globalThis.fetch}`];
  const target = 'https://www.bedrockexplorer.com/marketplace-content/1d6c82c8-42a3-4064-b4cd-3fa3ed7725f4';
  for (const mode of ['opts', 'bare']) {
    const t0 = Date.now();
    try {
      const res = mode === 'opts'
        ? await sdkFetch(target, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' } })
        : await sdkFetch(target);
      const body = typeof res.text === 'function' ? await res.text() : '';
      out.push(`${mode}:${res.status}/${String(body.length)}B@${Date.now() - t0}ms`);
    } catch (error) {
      out.push(`${mode}:ERR ${String((error && error.message) || error).slice(0, 90)}@${Date.now() - t0}ms`);
    }
  }
  return out.join(' | ');
}

export function isOwner(user) {
  return Boolean(user && user.id === CONFIG.ADMIN_ID);
}

export function describeError(error) {
  if (!error) return 'unknown error';
  const name = (error && error.name) || 'Error';
  const message = (error && error.message) || String(error);
  return `${name}: ${message}`.slice(0, 300);
}

let lastText = '';
let lastTextAt = 0;

export async function notifyOwner(text, key) {
  const now = Date.now();
  if (!key && text === lastText && now - lastTextAt < WINDOW_MS) return false;
  if (key) {
    const previous = lastSent.get(key) || 0;
    if (now - previous < WINDOW_MS) return false;
    lastSent.set(key, now);
  }
  lastText = text;
  lastTextAt = now;
  try {
    await api.sendMessage({
      chat_id: CONFIG.ADMIN_ID,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      text: `${tgEmoji(EMOJI.WARNING, '⚠️')} <b>Bot diagnostic</b>\n\n${text}`,
    });
    return true;
  } catch {
    return false;
  }
}

export async function notifyOwnerError(context, error, options = {}) {
  const lines = [`<b>Failed:</b> <code>${escapeHTML(context || 'update')}</code>`];
  if (options.userId) lines.push(`<b>User:</b> <code>${escapeHTML(String(options.userId))}</code>`);
  lines.push(`<b>Error:</b> <code>${escapeHTML(describeError(error))}</code>`);
  return notifyOwner(lines.join('\n'), options.key);
}
