import { api } from 'sdk';
import { CONFIG, EMOJI } from 'lib/config';
import { tgEmoji } from 'lib/ui';

export function isHelpCommand(message) {
  return /^\/help(?:@\w+)?(?:\s|$)/i.test(String(message.text || '').trim());
}

export function isOwner(user) {
  return Boolean(user && user.id === CONFIG.ADMIN_ID);
}

const OWNER_HELP = [
  `${tgEmoji(EMOJI.PENCIL, '✏️')} <b>𝗖𝗢𝗠𝗠𝗔𝗡𝗗 𝗟𝗜𝗦𝗧</b>`,
  '',
  `${tgEmoji('5447410659077661506', '🌐')} <b>𝗠𝗔𝗥𝗞𝗘𝗧𝗣𝗟𝗔𝗖𝗘 𝗧𝗥𝗔𝗗𝗘𝗥 𝗪𝗘𝗕𝗦𝗜𝗧𝗘</b>`,
  'https://marketplacetrader.xo.je',
  '',
  `${tgEmoji(EMOJI.SHIELD, '🛡')} <b>𝗔𝗗𝗠𝗜𝗡 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗦</b>`,
  '',
  `${tgEmoji('5348125953090403204', '▶️')} /start`,
  `${tgEmoji(EMOJI.LIGHTNING, '⚡️')} Start bot / download files / force-join access flow.`,
  '',
  `${tgEmoji(EMOJI.DOWN, '⬇️')} /upload`,
  `${tgEmoji(EMOJI.COMPUTER, '🖥')} Upload marketplace files with auto thumbnail, channel posting, and download link.`,
  '',
  `${tgEmoji('5391032818111363540', '📍')} /handle_media`,
  `${tgEmoji(EMOJI.PENCIL, '✏️')} Attach a Marketplace UUID to a file and finish the upload.`,
  '',
  `${tgEmoji('5391032818111363540', '📍')} /post`,
  `${tgEmoji(EMOJI.PENCIL, '✏️')} Create screenshot-of-the-day post.`,
  '',
  `${tgEmoji('5375338737028841420', '🔄')} /forward`,
  `${tgEmoji(EMOJI.MEGAPHONE, '📣')} Reply to a message and forward/broadcast it.`,
  '',
  `${tgEmoji(EMOJI.CROSS, '❌')} /delete`,
  `${tgEmoji(EMOJI.PENCIL, '✏️')} Remove a stored file by UUID.`,
  '',
  `${tgEmoji('5461117441612462242', '🙂')} /help`,
  `${tgEmoji(EMOJI.SPARKLES, '✨')} Show this command list.`,
].join('\n');

const USER_HELP = [
  `${tgEmoji('5461117441612462242', '🙂')} <b>𝗛𝗘𝗬 𝗧𝗛𝗘𝗥𝗘!</b>`,
  '',
  'Here are the available commands:',
  '',
  `${tgEmoji('5348125953090403204', '▶️')} /start`,
  `${tgEmoji(EMOJI.LIGHTNING, '⚡️')} Start the bot and download shared files.`,
  '',
  `${tgEmoji('5461117441612462242', '🙂')} /help`,
  `${tgEmoji(EMOJI.SPARKLES, '✨')} Show this help message.`,
].join('\n');

export async function handleHelp(message) {
  if (!isHelpCommand(message)) return false;
  await api.sendMessage({
    chat_id: message.chat.id,
    parse_mode: 'HTML',
    text: isOwner(message.from) ? OWNER_HELP : USER_HELP,
  });
  return true;
}
