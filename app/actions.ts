"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, UPLOAD_DIR, type Photo } from "@/lib/db";
import { actionUser } from "@/lib/auth";
import { run, type ActionResult } from "@/lib/result";
import { PROVIDERS, callAI, type ImageInput } from "@/lib/ai/providers";
import { getAiCredentials } from "@/lib/ai/config";
import { storeAiSettings } from "@/lib/ai/store";

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

/** Normalizes a datetime-local value ("2026-11-24T10:00") to "2026-11-24 10:00:00" so SQL comparisons work. */
function sqlDate(value: string): string {
  const v = value.replace("T", " ");
  return v.length === 16 ? v + ":00" : v;
}

function num(form: FormData, key: string): number | null {
  const raw = str(form, key);
  if (raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) throw new Error(`Valeur invalide pour ${key}`);
  return n;
}

/** Returns the contract only if it belongs to the logged-in user. */
function ownContract(userId: number, contractId: number) {
  const row = db().prepare("SELECT * FROM contracts WHERE id = ? AND user_id = ?").get(contractId, userId);
  if (!row) throw new Error("Contrat introuvable");
  return row as { id: number; status: string };
}

export async function createVehicle(form: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await actionUser();
    const plate = str(form, "plate").toUpperCase();
    const brand = str(form, "brand");
    const model = str(form, "model");
    const rate = num(form, "daily_rate") ?? 0;
    if (!plate || !brand || !model) throw new Error("Immatriculation, marque et modèle sont obligatoires");
    db().prepare(
      `INSERT INTO vehicles (user_id, plate, brand, model, year, color, daily_rate) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(user.id, plate, brand, model, num(form, "year"), str(form, "color") || null, rate);
    revalidatePath("/vehicles");
  });
}

export async function createClient(form: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await actionUser();
    const name = str(form, "full_name");
    if (!name) throw new Error("Le nom complet est obligatoire");
    db().prepare(
      `INSERT INTO clients (user_id, full_name, cin, license_number, phone, email, address, city, postal_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      user.id,
      name,
      str(form, "cin").toUpperCase() || null,
      str(form, "license_number") || null,
      str(form, "phone") || null,
      str(form, "email") || null,
      str(form, "address") || null,
      str(form, "city") || null,
      str(form, "postal_code") || null
    );
    revalidatePath("/clients");
  });
}

export async function createContract(form: FormData): Promise<ActionResult> {
  let id = 0;
  const result = await run(async () => {
    const user = await actionUser();
    const vehicleId = num(form, "vehicle_id");
    const clientId = num(form, "client_id");
    const start = sqlDate(str(form, "start_at"));
    const end = sqlDate(str(form, "end_at"));
    const rate = num(form, "daily_rate");
    const deposit = num(form, "deposit_amount") ?? 0;
    if (!vehicleId || !clientId || !start || !end || rate === null) {
      throw new Error("Veuillez remplir tous les champs obligatoires");
    }
    if (new Date(end) <= new Date(start)) throw new Error("La date de retour doit être après la date de départ");

    // Both the vehicle and the client must belong to this user.
    const vehicle = db().prepare("SELECT id FROM vehicles WHERE id = ? AND user_id = ?").get(vehicleId, user.id);
    const client = db().prepare("SELECT id FROM clients WHERE id = ? AND user_id = ?").get(clientId, user.id);
    if (!vehicle || !client) throw new Error("Véhicule ou client introuvable");

    const conflict = db().prepare(
      `SELECT id FROM contracts
       WHERE vehicle_id = ? AND status = 'open' AND start_at < ? AND end_at > ?`
    ).get(vehicleId, end, start);
    if (conflict) throw new Error("Ce véhicule est déjà loué sur cette période");

    const inserted = db().prepare(
      `INSERT INTO contracts (user_id, vehicle_id, client_id, start_at, end_at, daily_rate, deposit_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(user.id, vehicleId, clientId, start, end, rate, deposit);
    id = Number(inserted.lastInsertRowid);
  });
  if (!result.ok) return result;
  revalidatePath("/contracts");
  redirect(`/contracts/${id}`);
}

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export async function addPhoto(form: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await actionUser();
    const contractId = num(form, "contract_id");
    const kind = str(form, "kind");
    const angle = str(form, "angle") || "autre";
    const file = form.get("photo");
    if (!contractId || (kind !== "checkout" && kind !== "return")) throw new Error("Données invalides");
    ownContract(user.id, contractId);
    if (!(file instanceof File) || file.size === 0) throw new Error("Veuillez choisir une photo");
    const ext = ALLOWED_TYPES[file.type];
    if (!ext) throw new Error("Format non accepté (JPG, PNG ou WebP)");
    if (file.size > 10 * 1024 * 1024) throw new Error("Photo trop lourde (max 10 Mo)");

    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const name = `${randomUUID()}${ext}`;
    await fs.writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()), { mode: 0o600 });
    db().prepare(
      `INSERT INTO photos (contract_id, kind, angle, file_name) VALUES (?, ?, ?, ?)`
    ).run(contractId, kind, angle, name);
    revalidatePath(`/contracts/${contractId}`);
  });
}

export async function closeContract(form: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await actionUser();
    const id = num(form, "contract_id");
    if (!id) throw new Error("Contrat introuvable");
    ownContract(user.id, id);
    const deposit = str(form, "deposit_status");
    if (!["held", "refunded", "retained"].includes(deposit)) throw new Error("Statut de caution invalide");
    const count = db().prepare(
      `SELECT COUNT(*) AS n FROM photos WHERE contract_id = ? AND kind = 'return'`
    ).get(id) as { n: number };
    if (count.n === 0) throw new Error("Ajoutez au moins une photo au retour avant de clôturer");

    db().prepare(
      `UPDATE contracts SET status = 'closed', mileage_in = ?, damage_notes = ?, deposit_status = ? WHERE id = ? AND user_id = ?`
    ).run(num(form, "mileage_in"), str(form, "damage_notes") || null, deposit, id, user.id);
    revalidatePath(`/contracts/${id}`);
    revalidatePath("/contracts");
  });
}

/* ---------- Paramètres IA ---------- */

export async function saveAiSettings(form: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await actionUser();
    const provider = storeAiSettings(user.id, str(form, "provider"), str(form, "model"), str(form, "api_key"));
    revalidatePath("/settings");
    return `Paramètres enregistrés (${PROVIDERS[provider].label})`;
  });
}

export async function testAiSettings(): Promise<ActionResult> {
  return run(async () => {
    const user = await actionUser();
    const creds = getAiCredentials(user.id);
    const reply = await callAI({
      provider: creds.provider,
      model: creds.model,
      apiKey: creds.apiKey,
      system: "Tu es un test de connexion.",
      prompt: "Réponds uniquement par le mot OK.",
      maxTokens: 16,
    });
    return `Connexion réussie avec ${PROVIDERS[creds.provider].label} (${creds.model}). Réponse : ${reply.slice(0, 40)}`;
  });
}

export async function removeAiKey(): Promise<ActionResult> {
  return run(async () => {
    const user = await actionUser();
    db().prepare("DELETE FROM ai_settings WHERE user_id = ?").run(user.id);
    revalidatePath("/settings");
    return "Clé supprimée de votre compte";
  });
}

/* ---------- Fonctions IA ---------- */

const MAX_IMAGES_PER_SIDE = 4;

async function loadImages(photos: Photo[]): Promise<ImageInput[]> {
  const images: ImageInput[] = [];
  for (const p of photos) {
    const mimeType = p.file_name.endsWith(".png") ? "image/png"
      : p.file_name.endsWith(".webp") ? "image/webp" : "image/jpeg";
    images.push({ mimeType, data: await fs.readFile(path.join(UPLOAD_DIR, path.basename(p.file_name))) });
  }
  return images;
}

/** Compares checkout and return photos and drafts damage notes. The agent must review the result. */
export async function suggestDamageNotes(contractId: number): Promise<ActionResult> {
  return run(async () => {
    const user = await actionUser();
    ownContract(user.id, contractId);
    const photos = db().prepare("SELECT * FROM photos WHERE contract_id = ? ORDER BY id").all(contractId) as unknown as Photo[];
    const before = photos.filter((p) => p.kind === "checkout").slice(0, MAX_IMAGES_PER_SIDE);
    const after = photos.filter((p) => p.kind === "return").slice(0, MAX_IMAGES_PER_SIDE);
    if (before.length === 0 || after.length === 0) {
      throw new Error("Il faut des photos au départ et au retour pour comparer");
    }
    const creds = getAiCredentials(user.id);
    const images = await loadImages([...before, ...after]);
    const text = await callAI({
      provider: creds.provider,
      model: creds.model,
      apiKey: creds.apiKey,
      system: [
        "Tu es un assistant pour un agent de location de voitures au Maroc.",
        "Tu compares les photos du véhicule au départ (les premières) et au retour (les dernières).",
        "Signale uniquement les dommages nouveaux visibles au retour et absents au départ.",
        "Si tu ne vois pas de différence, dis-le clairement. N'invente rien.",
        "Réponds en français, en quelques puces courtes, avec la zone concernée pour chaque dommage.",
        "Ta réponse est une suggestion : l'agent doit la vérifier avant de l'enregistrer.",
      ].join(" "),
      prompt: `Photos au départ : ${before.length}. Photos au retour : ${after.length}. Liste les différences.`,
      images,
      maxTokens: 600,
    });
    return text;
  });
}
