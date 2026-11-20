import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { isBanned } from "@/lib/admin/repository";
import { getPseudo } from "@/lib/users/profiles";

/** Personne qui consulte la page, déduite de la session. */
export type Viewer = {
  /** « fournisseur:identifiant » (ex. « discord:8123… », « credentials:uuid »). */
  id: string;
  /** E-mail en minuscules, s'il est connu (sert à reconnaître les membres invités). */
  email: string | null;
  /** Pseudo choisi, ou nom provisoire tant qu'il n'est pas choisi. */
  name: string;
  /** `false` tant qu'un compte Discord, GitHub… n'a pas choisi son pseudo (page /bienvenue). */
  hasPseudo: boolean;
  /** Membre de l'équipe Griffin Lab (RESEARCH_TEAM_EMAILS) : peut créer des recherches officielles. */
  isTeam: boolean;
  /** Administrateur (ADMIN_EMAILS) : espace /admin, modération, tous les droits sur les recherches. */
  isAdmin: boolean;
};

const emailList = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

/** Renvoie la personne connectée, ou `null` sans session ou si le compte est banni (une lecture par requête). */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await auth();
  if (!session?.user.id) return null;
  const { id: rawId, provider, name, email } = session.user;
  const id = `${provider}:${rawId}`;
  const [pseudo, banned] = await Promise.all([getPseudo(id), isBanned(id)]);
  if (banned) return null; // une session encore ouverte ne donne plus accès à rien

  const normalizedEmail = email?.trim().toLowerCase() || null;
  // administrateur : uniquement un compte e-mail, dont l'adresse a été vérifiée par le site
  // (l'e-mail d'un compte Discord ou GitHub n'est pas contrôlé par nous)
  const isAdmin = provider === "credentials" && !!normalizedEmail && emailList(process.env.ADMIN_EMAILS).includes(normalizedEmail);
  return {
    id,
    email: normalizedEmail,
    name: pseudo ?? (name || normalizedEmail?.split("@")[0] || "anonyme"),
    hasPseudo: pseudo !== null,
    isTeam: isAdmin || (!!normalizedEmail && emailList(process.env.RESEARCH_TEAM_EMAILS).includes(normalizedEmail)),
    isAdmin,
  };
});

/** Pour l'espace admin : 404 à toute personne qui n'est pas administrateur. */
export async function requireAdmin(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) notFound();
  return viewer;
}

/**
 * Pour les pages et actions qui publient quelque chose : connexion obligatoire,
 * puis pseudo choisi. Redirige vers /connexion ou /bienvenue sinon.
 */
export async function requireViewer(returnTo: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/connexion?callbackUrl=${encodeURIComponent(returnTo)}`);
  if (!viewer.hasPseudo) redirect(`/bienvenue?callbackUrl=${encodeURIComponent(returnTo)}`);
  return viewer;
}
