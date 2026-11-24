import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./db";

/**
 * Encrypts user API keys at rest (AES-256-GCM).
 * Production: set ENCRYPTION_KEY to 32 random bytes encoded in base64 (openssl rand -base64 32).
 * Development: a key is generated once in data/.app-secret (git-ignored).
 */
let cachedKey: Buffer | null = null;

function masterKey(): Buffer {
  if (cachedKey) return cachedKey;
  const env = process.env.ENCRYPTION_KEY;
  if (env) {
    const buf = Buffer.from(env, "base64");
    if (buf.length !== 32) throw new Error("ENCRYPTION_KEY doit contenir 32 octets encodés en base64");
    cachedKey = buf;
    return buf;
  }
  if (process.env.NODE_ENV === "production") throw new Error("ENCRYPTION_KEY manquante sur le serveur");
  const file = path.join(DATA_DIR, ".app-secret");
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, crypto.randomBytes(32).toString("base64"), { mode: 0o600 });
  }
  cachedKey = Buffer.from(fs.readFileSync(file, "utf8").trim(), "base64");
  return cachedKey;
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", masterKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64");
}

export function decryptSecret(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}
