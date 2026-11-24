"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { ActionResult } from "@/lib/types";

async function run(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn();
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    if (message.includes("UNIQUE constraint failed: vehicles.plate")) {
      return { ok: false, error: "Cette immatriculation existe déjà" };
    }
    return { ok: false, error: message };
  }
}

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

export async function createVehicle(form: FormData): Promise<ActionResult> {
  return run(async () => {
    const plate = str(form, "plate").toUpperCase();
    const brand = str(form, "brand");
    const model = str(form, "model");
    const rate = num(form, "daily_rate") ?? 0;
    if (!plate || !brand || !model) throw new Error("Immatriculation, marque et modèle sont obligatoires");
    db().prepare(
      `INSERT INTO vehicles (plate, brand, model, year, color, daily_rate) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(plate, brand, model, num(form, "year"), str(form, "color") || null, rate);
    revalidatePath("/vehicles");
  });
}

export async function createClient(form: FormData): Promise<ActionResult> {
  return run(async () => {
    const name = str(form, "full_name");
    if (!name) throw new Error("Le nom complet est obligatoire");
    db().prepare(
      `INSERT INTO clients (full_name, cin, license_number, phone, email, address, city, postal_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
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

    const conflict = db().prepare(
      `SELECT id FROM contracts
       WHERE vehicle_id = ? AND status = 'open' AND start_at < ? AND end_at > ?`
    ).get(vehicleId, end, start);
    if (conflict) throw new Error("Ce véhicule est déjà loué sur cette période");

    const inserted = db().prepare(
      `INSERT INTO contracts (vehicle_id, client_id, start_at, end_at, daily_rate, deposit_amount)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(vehicleId, clientId, start, end, rate, deposit);
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
    const contractId = num(form, "contract_id");
    const kind = str(form, "kind");
    const angle = str(form, "angle") || "autre";
    const file = form.get("photo");
    if (!contractId || (kind !== "checkout" && kind !== "return")) throw new Error("Données invalides");
    if (!(file instanceof File) || file.size === 0) throw new Error("Veuillez choisir une photo");
    const ext = ALLOWED_TYPES[file.type];
    if (!ext) throw new Error("Format non accepté (JPG, PNG ou WebP)");
    if (file.size > 10 * 1024 * 1024) throw new Error("Photo trop lourde (max 10 Mo)");

    const dir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(dir, { recursive: true });
    const name = `${randomUUID()}${ext}`;
    await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));

    db().prepare(
      `INSERT INTO photos (contract_id, kind, angle, file_path) VALUES (?, ?, ?, ?)`
    ).run(contractId, kind, angle, `/uploads/${name}`);
    revalidatePath(`/contracts/${contractId}`);
  });
}

export async function closeContract(form: FormData): Promise<ActionResult> {
  return run(async () => {
    const id = num(form, "contract_id");
    if (!id) throw new Error("Contrat introuvable");
    const deposit = str(form, "deposit_status");
    if (!["held", "refunded", "retained"].includes(deposit)) throw new Error("Statut de caution invalide");
    const photosCount = db().prepare(
      `SELECT COUNT(*) AS n FROM photos WHERE contract_id = ? AND kind = 'return'`
    ).get(id) as { n: number };
    if (photosCount.n === 0) throw new Error("Ajoutez au moins une photo au retour avant de clôturer");

    db().prepare(
      `UPDATE contracts SET status = 'closed', mileage_in = ?, damage_notes = ?, deposit_status = ? WHERE id = ?`
    ).run(num(form, "mileage_in"), str(form, "damage_notes") || null, deposit, id);
    revalidatePath(`/contracts/${id}`);
    revalidatePath("/contracts");
  });
}
