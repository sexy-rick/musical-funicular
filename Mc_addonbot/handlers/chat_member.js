import { handleInfoChatMember } from 'lib/info';

export default async function (payload, ctx) {
  const update = ctx && ctx.update ? ctx.update : { chat_member: payload };
  await handleInfoChatMember(update);
}
