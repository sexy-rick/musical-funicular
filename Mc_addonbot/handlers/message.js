import { api } from 'sdk';
import { CONFIG } from 'lib/config';
import { isOwner, notifyOwnerError, runFetchDiagnostics } from 'lib/diag';
import { isMarkupError, setMarkupDisabled, escapeHTML } from 'lib/ui';
import { handleHelp } from 'lib/help';
import { handleDelete } from 'lib/delete';
import { handleMedia } from 'lib/handle_media';
import { handleUpload } from 'lib/upload';
import { handleStart } from 'lib/start';
import { handlePost } from 'lib/post';
import { handleForward } from 'lib/forward';
import { restoreLegacy } from 'lib/restore';

function commandOf(message) {
  const text = String((message && message.text) || '').trim();
  if (text) return text.split(/\s+/)[0].slice(0, 40);
  if (message && message.document) return '[document]';
  if (message && message.video) return '[video]';
  if (message && message.photo) return '[photo]';
  return '[message]';
}

function ownerOptions(message, suffix) {
  const owner = isOwner(message.from);
  return {
    userId: owner ? null : message.from && message.from.id,
    key: owner ? null : `message:${commandOf(message)}${suffix || ''}`,
  };
}

async function dispatch(message) {
  if (String(message.text || '').trim() === '/diagfetch' && message.from && message.from.id === CONFIG.ADMIN_ID) {
    const report = await runFetchDiagnostics();
    console.log('DIAGFETCH ' + report);
    await api.sendMessage({ chat_id: message.chat.id, parse_mode: 'HTML', text: `🩺 <code>${escapeHTML(report)}</code>` });
    return;
  }
  if (await handleHelp(message)) return;
  if (await handleDelete(message)) return;
  if (await handleForward(message)) return;
  if (await handlePost(message)) return;
  if (await handleUpload(message)) return;
  if (await handleMedia(message)) return;
  if (String(message.text || '').trim() === '/restore' && message.from && message.from.id === CONFIG.ADMIN_ID) {
    const report = await restoreLegacy();
    console.log('RESTORE ' + JSON.stringify(report));
    await api.sendMessage({ chat_id: message.chat.id, text: JSON.stringify(report) });
    return;
  }
  await handleStart(message);
}

export default async function (message) {
  if (!message || !message.chat) return;
  try {
    await dispatch(message);
    return;
  } catch (error) {
    console.error('message handler failed', error && error.stack ? error.stack : error);
    if (isMarkupError(error)) {
      setMarkupDisabled(true);
      try {
        await dispatch(message);
        await notifyOwnerError(`${commandOf(message)} (sent without buttons)`, error, ownerOptions(message, ':markup'));
        return;
      } catch (retryError) {
        error = retryError;
      } finally {
        setMarkupDisabled(false);
      }
    }
    try {
      await api.sendMessage({ chat_id: message.chat.id, text: 'Something went wrong. Please try again.' });
    } catch {
      return;
    }
    await notifyOwnerError(commandOf(message), error, ownerOptions(message));
  }
}
