import { api } from 'sdk';
import { EMOJI } from 'lib/config';
import { tgEmoji, escapeHTML, inlineKeyboard } from 'lib/ui';

export function normalizeChatMemberUpdate(update) {
  if (!update) return null;
  if (update.cm) return update.cm;
  if (update.chat_member) return update.chat_member;
  return null;
}

export function chatLink(chat) {
  if (!chat) return '';
  if (chat.username) return `https://t.me/${chat.username}`;
  if (Number.isInteger(chat.id)) {
    const id = String(chat.id).replace(/^-100/, '');
    return `https://t.me/c/${id}/1`;
  }
  return '';
}

export function memberStatus(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.status || null;
}

export function isInChannel(status) {
  return status === 'member' || status === 'administrator' || status === 'creator';
}

export function isOutChannel(status) {
  return status === 'left' || status === 'kicked';
}

export function detectAction(update) {
  const cm = normalizeChatMemberUpdate(update);
  if (!cm) return null;
  const before = memberStatus(cm.old_chat_member);
  const after = memberStatus(cm.new_chat_member);
  if (isOutChannel(before) && isInChannel(after)) return 'joined';
  if (isInChannel(before) && isOutChannel(after)) return 'left';
  return null;
}

export async function handleInfoChatMember(update) {
  const action = detectAction(update);
  if (!action) return true;
  const cm = normalizeChatMemberUpdate(update);
  const chat = cm.chat;
  const user = cm.new_chat_member && cm.new_chat_member.user;
  if (!chat || !user) return true;

  const link = chatLink(chat);
  const title = escapeHTML(chat.title || 'our channel');

  if (action === 'joined') {
    try {
      await api.sendMessage({
        chat_id: user.id,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        text: [
          `${tgEmoji('5461151367559141950', '🎉')} Thank you for joining `,
          '',
          `${tgEmoji(EMOJI.MEGAPHONE, '📣')} <b><a href="${link}">${title}</a></b>`,
          '',
          `We are glad to have you here. ${tgEmoji(EMOJI.SPARKLES, '✨')}`,
        ].join('\n'),
      });
    } catch {
      return true;
    }
    return true;
  }

  try {
    await api.sendMessage({
      chat_id: user.id,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: inlineKeyboard([[{ text: `Join ${chat.title || 'channel'}`, url: link }]]),
      text: [
        `${tgEmoji('5395695537687123235', '🚨')} You left one of our channels: `,
        '',
        `${tgEmoji(EMOJI.MEGAPHONE, '📣')} <b><a href="${link}">${title}</a></b>`,
        '',
        `Please join back! ${tgEmoji(EMOJI.LINK, '🔗')}`,
      ].join('\n'),
    });
  } catch {
    return true;
  }
  return true;
}
