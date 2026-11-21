"use server";

import { revalidatePath } from "next/cache";
import { banAccount, deleteAccount, deleteProposal, unbanAccount } from "@/lib/admin/repository";
import { configRole, getStoredRole, setStoredRole, SITE_ROLES, type SiteRole } from "@/lib/admin/roles";
import { getDb, isUuid } from "@/lib/db";
import { getResearchRepository } from "@/lib/research/repository";
import { getViewer } from "@/lib/viewer";

/**
 * Actions de l'espace administrateur. Chacune revérifie que la personne est
 * administrateur ; un administrateur ne peut ni se bannir ni se supprimer,
 * ni viser un autre administrateur.
 */

async function adminOnly() {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) throw new Error("Réservé aux administrateurs.");
  return viewer;
}

// « demo » : comptes de démonstration des books (sans connexion possible)
const USER_KEY = /^(credentials|discord|google|apple|github|demo):[\w-]{1,100}$/;

/** Refuse les cibles invalides, soi-même et les autres administrateurs. */
async function assertTarget(userKey: string, adminId: string) {
  if (!USER_KEY.test(userKey)) throw new Error("Compte invalide.");
  if (userKey === adminId) throw new Error("Tu ne peux pas agir sur ton propre compte.");
  const id = userKey.slice("credentials:".length);
  if (userKey.startsWith("credentials:") && isUuid(id)) {
    const db = await getDb();
    const [row] = await db.query<{ email: string }>("SELECT email FROM users WHERE id = $1", [id]);
    if (row && configRole("credentials", row.email) === "admin") throw new Error("Impossible de viser un autre administrateur.");
  }
  if ((await getStoredRole(userKey)) === "admin") throw new Error("Impossible de viser un autre administrateur.");
}

function refresh() {
  revalidatePath("/admin");
  revalidatePath("/recherches", "layout");
}

export async function banAction(userKey: string, form: FormData) {
  const admin = await adminOnly();
  await assertTarget(userKey, admin.id);
  const reason = String(form.get("reason") ?? "").trim().slice(0, 200);
  await banAccount(userKey, reason, admin.id);
  refresh();
}

export async function unbanAction(userKey: string) {
  await adminOnly();
  if (!USER_KEY.test(userKey)) return;
  await unbanAccount(userKey);
  refresh();
}

export async function deleteAccountAction(userKey: string) {
  const admin = await adminOnly();
  await assertTarget(userKey, admin.id);
  await deleteAccount(userKey);
  refresh();
}

export async function deleteGroupAction(groupId: string) {
  await adminOnly();
  await getResearchRepository().deleteGroup(groupId);
  refresh();
}

export async function deleteProposalAction(id: string) {
  await adminOnly();
  await deleteProposal(id);
  refresh();
}

/**
 * Change le rôle d'un compte (membre, équipe, admin). Seul un administrateur
 * fixé par la configuration du serveur peut nommer ou retirer un admin ; le
 * rôle admin est réservé aux comptes e-mail (adresse vérifiée par le site).
 */
export async function setRoleAction(userKey: string, role: SiteRole): Promise<{ ok: boolean; message?: string }> {
  const admin = await adminOnly();
  if (!USER_KEY.test(userKey) || !SITE_ROLES.includes(role)) return { ok: false, message: "Rôle invalide." };
  if (userKey === admin.id) return { ok: false, message: "Tu ne peux pas changer ton propre rôle." };

  const provider = userKey.split(":")[0];
  const id = userKey.slice(provider.length + 1);
  let email: string | null = null;
  let verified = false;
  if (provider === "credentials" && isUuid(id)) {
    const db = await getDb();
    const [row] = await db.query<{ email: string; email_verified_at: Date | null }>(
      "SELECT email, email_verified_at FROM users WHERE id = $1",
      [id],
    );
    email = row?.email ?? null;
    verified = !!row?.email_verified_at;
  }
  if (configRole(provider, email) === "admin") return { ok: false, message: "Administrateur fixé par la configuration du serveur." };

  const current = await getStoredRole(userKey);
  if ((role === "admin" || current === "admin") && !admin.isOwner) {
    return { ok: false, message: "Seul un administrateur principal peut nommer ou retirer un admin." };
  }
  if (role === "admin" && (provider !== "credentials" || !verified)) {
    return { ok: false, message: "Le rôle admin est réservé aux comptes e-mail confirmés." };
  }
  await setStoredRole(userKey, role, admin.id);
  refresh();
  revalidatePath("/books");
  return { ok: true };
}
