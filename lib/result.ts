export type ActionResult = { ok: true; data?: string } | { ok: false; error: string };

/** Runs an action body and converts thrown errors into a message the form can show. */
export async function run(fn: () => Promise<string | void>): Promise<ActionResult> {
  try {
    const data = await fn();
    return data ? { ok: true, data } : { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    if (message.includes("UNIQUE constraint failed: vehicles.plate")) {
      return { ok: false, error: "Cette immatriculation existe déjà" };
    }
    if (message.includes("UNIQUE constraint failed: users.email")) {
      return { ok: false, error: "Un compte existe déjà avec cet email" };
    }
    return { ok: false, error: message };
  }
}
