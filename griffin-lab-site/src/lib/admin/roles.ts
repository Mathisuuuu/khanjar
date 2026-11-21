import "server-only";
import { getDb } from "@/lib/db";

/**
 * Rôles sur le site. Deux sources :
 * - la configuration du serveur (ADMIN_EMAILS, RESEARCH_TEAM_EMAILS), fixe ;
 * - la table `user_roles`, modifiable depuis /admin.
 * Le rôle retenu est le plus élevé des deux.
 */
export type SiteRole = "member" | "team" | "admin";

export const SITE_ROLES: SiteRole[] = ["member", "team", "admin"];

export const roleLabels: Record<SiteRole, string> = {
  member: "Membre",
  team: "Équipe",
  admin: "Admin",
};

const rank: Record<SiteRole, number> = { member: 0, team: 1, admin: 2 };
export const higherRole = (a: SiteRole, b: SiteRole) => (rank[a] >= rank[b] ? a : b);

export const emailList = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

/** Rôle fixé par la configuration du serveur pour cet e-mail (compte e-mail vérifié pour admin). */
export function configRole(provider: string, email: string | null): SiteRole {
  if (!email) return "member";
  if (provider === "credentials" && emailList(process.env.ADMIN_EMAILS).includes(email)) return "admin";
  if (emailList(process.env.RESEARCH_TEAM_EMAILS).includes(email)) return "team";
  return "member";
}

export async function getStoredRole(userKey: string): Promise<SiteRole> {
  const db = await getDb();
  const [row] = await db.query<{ role: SiteRole }>("SELECT role FROM user_roles WHERE user_key = $1", [userKey]);
  return row?.role ?? "member";
}

/** « member » efface la ligne. */
export async function setStoredRole(userKey: string, role: SiteRole, updatedBy: string): Promise<void> {
  const db = await getDb();
  if (role === "member") {
    await db.query("DELETE FROM user_roles WHERE user_key = $1", [userKey]);
    return;
  }
  await db.query(
    `INSERT INTO user_roles (user_key, role, updated_by) VALUES ($1, $2, $3)
     ON CONFLICT (user_key) DO UPDATE SET role = EXCLUDED.role, updated_by = EXCLUDED.updated_by, updated_at = now()`,
    [userKey, role, updatedBy],
  );
}
