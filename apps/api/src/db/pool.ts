import Database from 'better-sqlite3';
import { join } from 'path';
import { mkdirSync } from 'fs';

const DB_DIR = join(__dirname, '..', '..');
const DB_PATH = process.env.DATABASE_URL || join(DB_DIR, 'cybertron.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    mkdirSync(join(DB_DIR), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// Compatibility wrapper for query-style usage
export function query<T = any>(sql: string, params?: any[]): { rows: T[] } {
  const database = getDb();
  
  // Handle different query types
  const trimmed = sql.trim().toUpperCase();
  
  if (trimmed.startsWith('SELECT')) {
    const stmt = database.prepare(sql);
    const rows = params ? stmt.all(...params) as T[] : stmt.all() as T[];
    return { rows };
  }
  
  if (trimmed.startsWith('INSERT')) {
    const stmt = database.prepare(sql);
    const result = params ? stmt.run(...params) : stmt.run();
    const selectStmt = database.prepare(`SELECT * FROM ${getTable(sql)} WHERE rowid = ?`);
    const row = selectStmt.get(result.lastInsertRowid) as T;
    return { rows: row ? [row] : [] };
  }
  
  if (trimmed.startsWith('UPDATE')) {
    const stmt = database.prepare(sql);
    params ? stmt.run(...params) : stmt.run();
    return { rows: [] };
  }
  
  if (trimmed.startsWith('DELETE')) {
    const stmt = database.prepare(sql);
    params ? stmt.run(...params) : stmt.run();
    return { rows: [] };
  }
  
  if (trimmed.startsWith('CREATE')) {
    database.exec(sql);
    return { rows: [] };
  }
  
  // Default: try execute
  database.exec(sql);
  return { rows: [] };
}

function getTable(sql: string): string {
  const match = sql.match(/INTO\s+(\w+)/i);
  return match ? match[1] : 'sqlite_master';
}
