import fs from "node:fs/promises";
import path from "node:path";
import { db, UPLOAD_DIR } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Serves a photo only to the user who owns its contract. Photos are not publicly accessible. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Not found", { status: 404 });
  const row = db().prepare(`
    SELECT p.file_name FROM photos p JOIN contracts c ON c.id = p.contract_id
    WHERE p.id = ? AND c.user_id = ?`).get(Number(params.id), user.id) as { file_name: string } | undefined;
  if (!row) return new Response("Not found", { status: 404 });
  const file = path.join(UPLOAD_DIR, path.basename(row.file_name));
  const data = await fs.readFile(file);
  const type = row.file_name.endsWith(".png") ? "image/png"
    : row.file_name.endsWith(".webp") ? "image/webp" : "image/jpeg";
  return new Response(data, {
    headers: { "content-type": type, "cache-control": "private, no-store" },
  });
}
