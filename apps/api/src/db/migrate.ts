import { getDb } from './pool.js';
import { readFileSync } from 'fs';
import { join } from 'path';

function migrate() {
  const db = getDb();
  
  console.log('Running migration...');
  
  const migrationPath = join(__dirname, 'migrations', '001_initial_schema.sql');
  const sql = readFileSync(migrationPath, 'utf-8');
  
  // SQLite: remove PostgreSQL-specific syntax
  const sqliteSql = sql
    .replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";/g, '')
    .replace(/CREATE EXTENSION IF NOT EXISTS "pgcrypto";/g, '')
    .replace(/uuid_generate_v4\(\)/g, "(lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || substr(hex(randomblob(6)),2))")
    .replace(/TIMESTAMPTZ/g, 'TEXT')
    .replace(/NOW\(\)/g, "datetime('now')")
    .replace(/BIGINT/g, 'INTEGER')
    .replace(/TEXT\[\]/g, 'TEXT')
    .replace(/SERIAL/g, 'INTEGER')
    .replace(/BOOLEAN/g, 'INTEGER')
    .replace(/CHECK\s*\([^)]+\)/g, '')
    .replace(/ON DELETE CASCADE/g, '')
    .replace(/ON DELETE SET NULL/g, '')
    .replace(/IF NOT EXISTS/g, 'IF NOT EXISTS')
    .replace(/;\s*$/gm, ';');
  
  db.exec(sqliteSql);
  console.log('Migration complete!');
}

migrate();
