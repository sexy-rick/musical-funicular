import { db } from 'sdk';
import { sql } from 'sdk/db';

const FILE_COLUMNS = 'uuid, file_id, type, category, name, items, caption, marketplace_url, thumbnail_url, title, creator, message_link, version, version_key, updated_at';

export async function restoreLegacy() {
  const report = {};

  try {
    const count = await db.get(sql`select count(*) as c from files`);
    if (Number(count.c) === 0) {
      await db.run(sql`insert or ignore into files (${sql.raw(FILE_COLUMNS)}) select ${sql.raw(FILE_COLUMNS)} from files_legacy`);
      const after = await db.get(sql`select count(*) as c from files`);
      report.files = `copied ${after.c}`;
    } else {
      report.files = `already holds ${count.c}`;
    }
  } catch (error) {
    report.files = String(error && error.message).slice(0, 90);
  }

  let oldShape = false;
  try {
    await db.get(sql`select telegram_id from users limit 1`);
    oldShape = true;
  } catch {
    oldShape = false;
  }

  if (!oldShape) {
    report.users = 'already the file-bot shape';
    return report;
  }

  try {
    await db.run(sql`alter table users rename to users_arena_old`);
    await db.run(sql`alter table users_legacy rename to users`);
    const after = await db.get(sql`select count(*) as c from users`);
    report.users = `restored ${after.c} from users_legacy`;
  } catch (error) {
    report.users = String(error && error.message).slice(0, 90);
  }
  return report;
}
