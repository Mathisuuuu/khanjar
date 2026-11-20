"use server";

import { revalidatePath } from "next/cache";
import { banAccount, deleteAccount, deleteProposal, unbanAccount } from "@/lib/admin/repository";
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
    const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase());
    if (row && admins.includes(row.email)) throw new Error("Impossible de viser un autre administrateur.");
  }
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
