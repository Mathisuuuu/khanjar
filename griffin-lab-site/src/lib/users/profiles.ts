import "server-only";
import { getDb } from "@/lib/db";

/**
 * Pseudos affichés sur le site, pour tous les comptes (e-mail, Discord,
 * GitHub…). Clé : « fournisseur:identifiant » (voir lib/auth/viewer.ts).
 * Un pseudo est unique, sans tenir compte des majuscules.
 */

export async function getPseudo(userKey: string): Promise<string | null> {
  const db = await getDb();
  const [row] = await db.query<{ pseudo: string }>("SELECT pseudo FROM profiles WHERE user_key = $1", [userKey]);
  return row?.pseudo ?? null;
}

/** Crée ou change le pseudo. Renvoie `false` s'il est déjà pris. */
export async function setPseudo(userKey: string, pseudo: string): Promise<boolean> {
  const db = await getDb();
  try {
    await db.query(
      `INSERT INTO profiles (user_key, pseudo) VALUES ($1, $2)
       ON CONFLICT (user_key) DO UPDATE SET pseudo = EXCLUDED.pseudo, updated_at = now()`,
      [userKey, pseudo],
    );
    return true;
  } catch (error) {
    if ((error as { code?: string }).code === "23505") return false; // index unique : pseudo déjà pris
    throw error;
  }
}
