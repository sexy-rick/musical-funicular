import { api } from 'sdk';
import { isOwner, notifyOwnerError } from 'lib/diag';
import { isMarkupError, setMarkupDisabled } from 'lib/ui';
import { handleUploadCallback } from 'lib/upload';

function ownerOptions(query, suffix) {
  const owner = isOwner(query && query.from);
  return {
    userId: owner ? null : query && query.from && query.from.id,
    key: owner ? null : `callback:${String((query && query.data) || '')}${suffix || ''}`,
  };
}

async function dispatch(query) {
  if (await handleUploadCallback(query)) return true;
  return false;
}

export default async function (query) {
  const data = String((query && query.data) || '[callback]').slice(0, 40);
  try {
    if (await dispatch(query)) return;
  } catch (error) {
    console.error('callback handler failed', error && error.stack ? error.stack : error);
    if (isMarkupError(error)) {
      setMarkupDisabled(true);
      try {
        await dispatch(query);
        await notifyOwnerError(`callback ${data} (sent without buttons)`, error, ownerOptions(query, ':markup'));
        return;
      } catch (retryError) {
        error = retryError;
      } finally {
        setMarkupDisabled(false);
      }
    }
    try {
      await api.answerCallbackQuery({ callback_query_id: query.id, text: 'Something went wrong. Please try again.' });
    } catch {
      return;
    }
    await notifyOwnerError(`callback ${data}`, error, ownerOptions(query));
    return;
  }
  try {
    await api.answerCallbackQuery({ callback_query_id: query.id });
  } catch {
    return;
  }
}
