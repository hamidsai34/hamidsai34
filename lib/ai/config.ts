import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { PROVIDERS, type Provider } from "./providers";

export type StoredAiSettings = {
  provider: Provider;
  model: string;
  key_last4: string;
  updated_at: string;
};

/** Settings shown in the UI. Never includes the key itself. */
export function getAiSettings(userId: number): StoredAiSettings | null {
  const row = db().prepare(
    "SELECT provider, model, key_last4, updated_at FROM ai_settings WHERE user_id = ?"
  ).get(userId);
  return (row as StoredAiSettings | undefined) ?? null;
}

/** Decrypts the user's key. Only call this inside server code that immediately uses it. */
export function getAiCredentials(userId: number): { provider: Provider; model: string; apiKey: string } {
  const row = db().prepare(
    "SELECT provider, model, key_encrypted FROM ai_settings WHERE user_id = ?"
  ).get(userId) as { provider: Provider; model: string; key_encrypted: string } | undefined;
  if (!row) throw new Error("Aucune clé d'IA configurée. Ajoutez votre clé dans Paramètres.");
  return {
    provider: row.provider,
    model: row.model || PROVIDERS[row.provider].defaultModel,
    apiKey: decryptSecret(row.key_encrypted),
  };
}
