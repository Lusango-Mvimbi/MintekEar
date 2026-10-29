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
      division TEXT NOT NULL DEFAULT '',
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

  const managerColumns = db.prepare("PRAGMA table_info(managers)").all() as { name: string }[];
  if (!managerColumns.some((column) => column.name === "division")) {
    db.exec("ALTER TABLE managers ADD COLUMN division TEXT NOT NULL DEFAULT ''");
  }

  const placements: Record<string, string> = {
    "mgr-thabo": "pyrometallurgy",
    "mgr-lerato": "hydrometallurgy",
    "mgr-ayesha": "analytical-chemistry",
    "mgr-johan": "mineral-processing",
    "mgr-sipho": "measurement-and-control",
  };
  const place = db.prepare("UPDATE managers SET division = ? WHERE id = ? AND division = ''");
  for (const [id, division] of Object.entries(placements)) place.run(division, id);

  db.exec(`
    UPDATE reviews SET created_at = substr(created_at, 1, 10) WHERE length(created_at) > 10;
    UPDATE managers SET created_at = substr(created_at, 1, 10) WHERE length(created_at) > 10;
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
