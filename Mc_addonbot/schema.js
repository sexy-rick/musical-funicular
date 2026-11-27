import { table, integer, text, json } from 'sdk/db';

export const users = table('users', {
  id: integer('id').primaryKey(),
  firstName: text('first_name'),
  username: text('username'),
  joinedAt: integer('joined_at'),
});

export const files = table('files', {
  uuid: text('uuid').primaryKey(),
  fileId: text('file_id').notNull(),
  type: text('type'),
  category: text('category'),
  name: text('name'),
  items: json('items'),
  caption: text('caption'),
  marketplaceUrl: text('marketplace_url'),
  thumbnailUrl: text('thumbnail_url'),
  title: text('title'),
  creator: text('creator'),
  messageLink: text('message_link'),
  version: text('version'),
  versionKey: text('version_key'),
  updatedAt: integer('updated_at'),
});

export const uploadSessions = table('upload_sessions', {
  userId: integer('user_id').primaryKey(),
  uuid: text('uuid').notNull(),
  category: text('category'),
  name: text('name'),
  files: json('files'),
  paused: integer('paused').notNull().default(0),
  requestedBy: text('requested_by'),
  requestedByUserId: integer('requested_by_user_id'),
  status: text('status'),
  marketplaceUrl: text('marketplace_url'),
  thumbnailUrl: text('thumbnail_url'),
  title: text('title'),
  creator: text('creator'),
  selectedChannels: json('selected_channels'),
  mediaId: text('media_id'),
  requestedAddon: text('requested_addon'),
  requestId: text('request_id'),
  requestedMeta: json('requested_meta'),
  autoRecognised: integer('auto_recognised'),
  createdAt: integer('created_at').notNull(),
});

export const postSessions = table('post_sessions', {
  userId: integer('user_id').primaryKey(),
  step: text('step').notNull(),
  photo: text('photo'),
  username: text('username'),
  caption: text('caption'),
  createdAt: integer('created_at').notNull(),
});
