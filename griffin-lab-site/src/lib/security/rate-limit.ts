import "server-only";
import { headers } from "next/headers";
import { getDb } from "@/lib/db";

/**
 * Limite le nombre de tentatives (connexion, inscription, dépôts) sur une
 * fenêtre de temps. Les compteurs sont dans la base : ils survivent à un
 * redémarrage du site.
 */

/** Compte une tentative ; renvoie `false` si la limite est dépassée. */
export async function consume(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const db = await getDb();
  const [row] = await db.query<{ hits: number }>(
    `INSERT INTO rate_limits (key, hits, reset_at) VALUES ($1, 1, now() + make_interval(secs => $2))
     ON CONFLICT (key) DO UPDATE SET
       hits     = CASE WHEN rate_limits.reset_at < now() THEN 1 ELSE rate_limits.hits + 1 END,
       reset_at = CASE WHEN rate_limits.reset_at < now() THEN EXCLUDED.reset_at ELSE rate_limits.reset_at END
     RETURNING hits`,
    [key, windowSeconds],
  );
  // ménage occasionnel des compteurs expirés
  if (Math.random() < 0.02) {
    void db.query("DELETE FROM rate_limits WHERE reset_at < now() - interval '1 day'").catch(() => undefined);
  }
  return Number(row?.hits ?? 0) <= limit;
}

/**
 * Adresse IP du visiteur. Nginx remplace l'en-tête X-Real-IP par l'adresse
 * réelle de la connexion : un visiteur ne peut pas la falsifier.
 */
export async function clientIp(source?: Headers): Promise<string> {
  try {
    const list = source ?? (await headers());
    return list.get("x-real-ip")?.trim() || "local";
  } catch {
    return "local"; // hors d'une requête
  }
}
