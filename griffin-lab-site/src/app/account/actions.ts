"use server";

import { revalidatePath } from "next/cache";
import { signIn, signOut } from "@/auth";
import { deleteAccount } from "@/lib/admin/repository";
import { redirect } from "next/navigation";
import { consume } from "@/lib/security/rate-limit";
import { removeDiscordLink } from "@/lib/discord/links";
import { hashPassword, verifyPassword } from "@/lib/users/password";
import { setPseudo } from "@/lib/users/profiles";
import { getUserRepository } from "@/lib/users/repository";
import { pseudoSchema, signUpSchema } from "@/lib/users/schema";
import { PROFILE_VISIBILITIES, profileHref, setVisibility, type ProfileVisibility } from "@/lib/users/identity";
import { claimPost, getCertificate, releasePost, setCertificatePublic } from "@/lib/certificates/settings";
import { postCertificate } from "@/lib/discord/certificate";
import { requireViewer } from "@/lib/auth/viewer";

export type VisibilityState = { ok?: boolean; message?: string };

/** Réglage d'anonymat : public, anonyme hors de ses books, ou anonyme pour tout le monde. */
export async function setVisibilityAction(_prev: VisibilityState, form: FormData): Promise<VisibilityState> {
  const viewer = await requireViewer("/account");
  const value = String(form.get("visibility") ?? "") as ProfileVisibility;
  if (!PROFILE_VISIBILITIES.includes(value)) return { message: "Choix invalide." };
  if (!(await consume(`visibility:${viewer.id}`, 30, 60 * 60))) return { message: "Trop de changements. Réessaie plus tard." };
  await setVisibility(viewer.id, value);
  revalidatePath("/", "layout");
  return { ok: true, message: "Enregistré." };
}

export type AccountFormState = { ok?: boolean; message?: string };

/** Changement de pseudo, sans quitter /account. */
export async function changePseudoAction(_prev: AccountFormState, form: FormData): Promise<AccountFormState> {
  const viewer = await requireViewer("/account");
  const parsed = pseudoSchema.safeParse(String(form.get("pseudo") ?? ""));
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Pseudo invalide." };
  if (parsed.data === viewer.name) return { ok: true, message: "C'est déjà ton pseudo." };
  if (!(await consume(`pseudo:${viewer.id}`, 10, 60 * 60))) return { message: "Trop de changements. Réessaie dans une heure." };
  if (!(await setPseudo(viewer.id, parsed.data))) return { message: "Ce pseudo est déjà pris." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Pseudo mis à jour." };
}

/** Changement de mot de passe (comptes e-mail) : l'ancien est demandé. */
export async function changePasswordAction(_prev: AccountFormState, form: FormData): Promise<AccountFormState> {
  const viewer = await requireViewer("/account");
  if (!viewer.id.startsWith("credentials:")) return { message: "Ton compte n'a pas de mot de passe sur Fleija." };
  if (!(await consume(`password-change:${viewer.id}`, 5, 15 * 60))) return { message: "Trop de tentatives. Réessaie plus tard." };

  const repository = getUserRepository();
  const user = await repository.findById(viewer.id.slice("credentials:".length));
  if (!user) return { message: "Compte introuvable." };

  const current = String(form.get("current") ?? "");
  const next = String(form.get("password") ?? "");
  if (!(await verifyPassword(current, user.passwordHash))) return { message: "Mot de passe actuel incorrect." };
  const parsed = signUpSchema.shape.password.safeParse(next);
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Mot de passe invalide." };
  if (next !== String(form.get("confirm") ?? "")) return { message: "Les deux nouveaux mots de passe ne sont pas identiques." };
  if (next === current) return { message: "Choisis un mot de passe différent de l'actuel." };

  await repository.updatePassword(user.id, await hashPassword(next));
  // les autres sessions sont fermées ; celle-ci est rouverte avec le nouveau mot de passe
  await signIn("credentials", { email: user.email, password: next, redirectTo: "/account?password=1" });
  return { ok: true, message: "Mot de passe changé." };
}

/**
 * Suppression définitive du compte : la personne retape son pseudo
 * (et son mot de passe pour un compte e-mail).
 */
export async function deleteOwnAccountAction(_prev: AccountFormState, form: FormData): Promise<AccountFormState> {
  const viewer = await requireViewer("/account");
  if (!(await consume(`account-delete:${viewer.id}`, 5, 15 * 60))) return { message: "Trop de tentatives. Réessaie plus tard." };
  if (String(form.get("confirm") ?? "").trim() !== viewer.name) {
    return { message: `Recopie exactement ton pseudo (« ${viewer.name} ») pour confirmer.` };
  }
  if (viewer.id.startsWith("credentials:")) {
    const user = await getUserRepository().findById(viewer.id.slice("credentials:".length));
    if (!user || !(await verifyPassword(String(form.get("password") ?? ""), user.passwordHash))) {
      return { message: "Mot de passe incorrect." };
    }
  }
  await deleteAccount(viewer.id);
  await signOut({ redirectTo: "/?compte=supprime" });
  return {};
}

/* ---------- Certificats ---------- */

export type CertificateState = { ok?: boolean; message?: string };

/** Affiche ou masque un de ses certificats sur son profil public. */
export async function setCertificatePublicAction(id: string, visible: boolean): Promise<CertificateState> {
  const viewer = await requireViewer("/account");
  if (!(await consume(`certificate-public:${viewer.id}`, 60, 60 * 60))) return { message: "Trop de changements. Réessaie plus tard." };
  if (!(await setCertificatePublic(viewer.id, id, visible))) return { message: "Certificat introuvable." };
  revalidatePath("/account");
  revalidatePath(profileHref(viewer.name));
  return { ok: true, message: visible ? "Certificat affiché sur ton profil public." : "Certificat retiré de ton profil public." };
}

/** Publie un de ses certificats dans #certificates sur Discord (une seule fois), avec son pseudo. */
export async function postCertificateAction(id: string): Promise<CertificateState> {
  const viewer = await requireViewer("/account");
  if (!(await consume(`certificate-post:${viewer.id}`, 5, 60 * 60))) return { message: "Trop de tentatives. Réessaie plus tard." };
  const certificate = await getCertificate(id);
  if (!certificate || certificate.authorId !== viewer.id) return { message: "Certificat introuvable." };
  if (!(await claimPost(viewer.id, id))) return { message: "Ce certificat a déjà été publié dans #certificates." };
  try {
    await postCertificate(certificate, viewer.name);
  } catch (error) {
    await releasePost(viewer.id, id);
    console.error("Certificat non publié dans #certificates :", error instanceof Error ? error.message : error);
    return { message: "Publication impossible sur Discord pour le moment. Réessaie plus tard." };
  }
  revalidatePath("/account");
  return { ok: true, message: "Certificat publié dans #certificates." };
}

/** Délie le compte Discord (la photo de profil n'est plus affichée). */
export async function unlinkDiscordAction(): Promise<void> {
  const viewer = await requireViewer("/account");
  if (viewer.id.startsWith("discord:")) return; // compte Discord : la photo vient de la connexion elle-même
  await removeDiscordLink(viewer.id);
  revalidatePath("/", "layout");
  redirect("/account?discord=unlinked#profil");
}
