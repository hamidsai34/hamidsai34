import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

export const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const DB_PATH = process.env.DATABASE_PATH ?? path.join(DATA_DIR, "gestionauto.db");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

declare global {
  // eslint-disable-next-line no-var
  var __db: DatabaseSync | undefined;
}

function init(db: DatabaseSync) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL
    );

    -- One AI configuration per user. The API key is stored encrypted (see lib/crypto.ts).
    CREATE TABLE IF NOT EXISTS ai_settings (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL CHECK (provider IN ('gemini','openai','anthropic')),
      model TEXT NOT NULL,
      key_encrypted TEXT NOT NULL,
      key_last4 TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plate TEXT NOT NULL,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER,
      color TEXT,
      daily_rate REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (user_id, plate)
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      full_name TEXT NOT NULL,
      cin TEXT,
      license_number TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      city TEXT,
      postal_code TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ref TEXT UNIQUE,
      vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
      client_id INTEGER NOT NULL REFERENCES clients(id),
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      daily_rate REAL NOT NULL,
      deposit_amount REAL NOT NULL DEFAULT 0,
      deposit_status TEXT NOT NULL DEFAULT 'held' CHECK (deposit_status IN ('held','refunded','retained')),
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
      mileage_out INTEGER,
      mileage_in INTEGER,
      damage_notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK (kind IN ('checkout','return')),
      angle TEXT NOT NULL,
      file_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  db.exec(`CREATE TRIGGER IF NOT EXISTS contracts_ref AFTER INSERT ON contracts
    WHEN NEW.ref IS NULL BEGIN
      UPDATE contracts SET ref = 'BK-' || (1000 + NEW.id) WHERE id = NEW.id;
    END;`);
}

export function db(): DatabaseSync {
  if (!globalThis.__db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const instance = new DatabaseSync(DB_PATH);
    init(instance);
    globalThis.__db = instance;
  }
  return globalThis.__db;
}

export type Vehicle = {
  id: number; plate: string; brand: string; model: string;
  year: number | null; color: string | null; daily_rate: number;
};

export type Client = {
  id: number; full_name: string; cin: string | null; license_number: string | null;
  phone: string | null; email: string | null; address: string | null;
  city: string | null; postal_code: string | null;
};

export type Contract = {
  id: number; ref: string; vehicle_id: number; client_id: number;
  start_at: string; end_at: string; daily_rate: number; deposit_amount: number;
  deposit_status: "held" | "refunded" | "retained"; status: "open" | "closed";
  mileage_out: number | null; mileage_in: number | null; damage_notes: string | null;
};

export type Photo = {
  id: number; contract_id: number; kind: "checkout" | "return"; angle: string; file_name: string;
};
