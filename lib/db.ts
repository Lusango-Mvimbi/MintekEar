import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { seedIfEmpty } from "./seed";

const globalForDb = globalThis as unknown as { mintekearDb?: DatabaseSync };

function databasePath(): string {
  if (process.env.MINTEKEAR_DB) return process.env.MINTEKEAR_DB;
  return path.join(process.cwd(), "data", "mintekear.db");
}

function migrate(db: DatabaseSync) {
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS managers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      title TEXT NOT NULL,
      sample INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      manager_id TEXT NOT NULL REFERENCES managers(id),
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS review_tags (
      review_id TEXT NOT NULL REFERENCES reviews(id),
      tag TEXT NOT NULL,
      PRIMARY KEY (review_id, tag)
    );
    CREATE INDEX IF NOT EXISTS reviews_manager_created ON reviews (manager_id, created_at DESC);
  `);
}

export function getDb(): DatabaseSync {
  if (!globalForDb.mintekearDb) {
    const file = databasePath();
    if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
    const db = new DatabaseSync(file);
    migrate(db);
    if (process.env.MINTEKEAR_SKIP_SEED !== "1") seedIfEmpty(db);
    globalForDb.mintekearDb = db;
  }
  return globalForDb.mintekearDb;
}

export function resetDbForTests() {
  globalForDb.mintekearDb?.close();
  globalForDb.mintekearDb = undefined;
}
