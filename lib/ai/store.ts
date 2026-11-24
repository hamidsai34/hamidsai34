import { db } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { PROVIDERS, isProvider, type Provider } from "./providers";

const KEY_PATTERN = /^[\x21-\x7e]{20,300}$/;

/**
 * Validates and saves a user's AI settings. Leave `apiKey` empty to keep the stored key.
 * Throws an Error with a French message when the input is invalid.
 */
export function storeAiSettings(userId: number, providerRaw: string, modelRaw: string, apiKey: string): Provider {
  if (!isProvider(providerRaw)) throw new Error("Choisissez un fournisseur d'IA");
  const model = modelRaw || PROVIDERS[providerRaw].defaultModel;
  if (!/^[A-Za-z0-9._:-]{1,80}$/.test(model)) throw new Error("Nom de modèle invalide");

  const existing = db().prepare("SELECT user_id FROM ai_settings WHERE user_id = ?").get(userId);
  if (!apiKey && !existing) throw new Error("Collez votre clé API");
  if (apiKey && !KEY_PATTERN.test(apiKey)) throw new Error("Format de clé invalide");

  if (apiKey) {
    db().prepare(`
      INSERT INTO ai_settings (user_id, provider, model, key_encrypted, key_last4, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET provider = excluded.provider, model = excluded.model,
        key_encrypted = excluded.key_encrypted, key_last4 = excluded.key_last4, updated_at = excluded.updated_at
    `).run(userId, providerRaw, model, encryptSecret(apiKey), apiKey.slice(-4));
  } else {
    db().prepare("UPDATE ai_settings SET provider = ?, model = ?, updated_at = datetime('now') WHERE user_id = ?")
      .run(providerRaw, model, userId);
  }
  return providerRaw;
}
