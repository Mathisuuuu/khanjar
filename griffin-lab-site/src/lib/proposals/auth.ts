import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { getViewer } from "@/lib/viewer";

/**
 * Vérifie le jeton de modération envoyé dans l'en-tête
 * `Authorization: Bearer <ADMIN_TOKEN>`. Comparaison en temps constant.
 */
export function isAdminRequest(request: Request): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || expected === "change-moi") return false; // modération désactivée tant que le jeton n'est pas défini

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!provided) return false;

  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(provided), digest(expected));
}

/**
 * Modération autorisée : jeton valide, ou session d'un administrateur.
 * Pour une modification par session, la requête doit venir du site lui-même
 * (en-tête Origin) : une autre page ne peut pas agir à la place de l'admin.
 */
export async function isModeratorRequest(request: Request): Promise<boolean> {
  if (isAdminRequest(request)) return true;
  if (request.method !== "GET") {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (!origin || !host || new URL(origin).host !== host) return false;
  }
  return !!(await getViewer())?.isAdmin;
}
