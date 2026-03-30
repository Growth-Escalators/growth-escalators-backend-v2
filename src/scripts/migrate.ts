import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from '../db/index';

async function runMigrations() {
  const migrationsFolder = path.join(__dirname, '..', '..', 'src', 'db', 'migrations');
  console.log('[migrate] Migration started');
  console.log('[migrate] Migrations folder:', migrationsFolder);

  try {
    await migrate(db, { migrationsFolder });
    console.log('[migrate] Migration complete');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('[migrate] Migration failed:', error);
    await pool.end();
    process.exit(1);
  }
}

runMigrations();
