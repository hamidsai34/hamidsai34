"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword, createSession, setSessionCookie, clearSession } from "@/lib/auth";
import { run, type ActionResult } from "@/lib/result";
import { storeAiSettings } from "@/lib/ai/store";

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

/** Saves the AI key typed on the login or registration form, if one was entered. */
function saveOptionalKey(userId: number, form: FormData) {
  const key = str(form, "api_key");
  if (!key) return;
  storeAiSettings(userId, str(form, "provider"), "", key);
}

export async function register(form: FormData): Promise<ActionResult> {
  let token = "";
  const result = await run(async () => {
    const email = str(form, "email").toLowerCase();
    const password = String(form.get("password") ?? "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Adresse email invalide");
    if (password.length < 8) throw new Error("Le mot de passe doit contenir au moins 8 caractères");
    const inserted = db().prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)")
      .run(email, hashPassword(password));
    const userId = Number(inserted.lastInsertRowid);
    saveOptionalKey(userId, form);
    token = createSession(userId);
  });
  if (!result.ok) return result;
  await setSessionCookie(token);
  redirect("/");
}

export async function login(form: FormData): Promise<ActionResult> {
  let token = "";
  const result = await run(async () => {
    const email = str(form, "email").toLowerCase();
    const password = String(form.get("password") ?? "");
    const user = db().prepare("SELECT id, password_hash FROM users WHERE email = ?").get(email) as
      | { id: number; password_hash: string }
      | undefined;
    // Same message whether the email or the password is wrong.
    if (!user || !verifyPassword(password, user.password_hash)) {
      throw new Error("Email ou mot de passe incorrect");
    }
    saveOptionalKey(user.id, form);
    token = createSession(user.id);
  });
  if (!result.ok) return result;
  await setSessionCookie(token);
  redirect("/");
}

export async function logout() {
  await clearSession();
  redirect("/login");
}
