import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { isBanned } from "@/lib/admin/repository";
import { configRole, getStoredRole, higherRole, type SiteRole } from "@/lib/admin/roles";
import { getPseudo } from "@/lib/users/profiles";
import { getUserRepository } from "@/lib/users/repository";

/** Personne qui consulte la page, déduite de la session. */
export type Viewer = {
  /** « fournisseur:identifiant » (ex. « discord:8123… », « credentials:uuid »). */
  id: string;
  /** E-mail en minuscules, s'il est connu (sert à reconnaître les membres invités). */
  email: string | null;
  /** Pseudo choisi, ou nom provisoire tant qu'il n'est pas choisi. */
  name: string;
  /** `false` tant qu'un compte Discord ou Google n'a pas choisi son pseudo (page /bienvenue). */
  hasPseudo: boolean;
  /** Membre de l'équipe Griffin Lab : peut créer des recherches officielles. */
  isTeam: boolean;
  /** Administrateur : espace /admin, modération, tous les droits sur les recherches. */
  isAdmin: boolean;
  /** Administrateur fixé par la configuration du serveur (ADMIN_EMAILS) : seul à pouvoir nommer d'autres admins. */
  isOwner: boolean;
  role: SiteRole;
};

/** Renvoie la personne connectée, ou `null` sans session ou si le compte est banni (une lecture par requête). */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await auth();
  if (!session?.user.id) return null;
  const { id: rawId, provider, name, email, authAt, emailTrusted } = session.user;
  const id = `${provider}:${rawId}`;
  const [pseudo, banned, stored, user] = await Promise.all([
    getPseudo(id),
    isBanned(id),
    getStoredRole(id),
    provider === "credentials" ? getUserRepository().findById(rawId) : Promise.resolve(null),
  ]);
  if (banned) return null; // une session encore ouverte ne donne plus accès à rien
  if (provider === "credentials") {
    // compte supprimé, ou mot de passe changé depuis l'ouverture de cette session (session volée, appareil perdu…)
    if (!user) return null;
    if (user.passwordChangedAt && (authAt ?? 0) * 1000 < Date.parse(user.passwordChangedAt) - 1000) return null;
  }

  // compte e-mail : adresse confirmée par le site ; OAuth : seulement si le fournisseur la déclare vérifiée
  const trusted = provider === "credentials" ? user?.email : emailTrusted ? email : null;
  const normalizedEmail = trusted?.trim().toLowerCase() || null;
  // administrateur par la configuration : uniquement un compte e-mail, dont l'adresse a été vérifiée par le site
  // (l'e-mail d'un compte Discord ou Google n'est pas contrôlé par nous) ; idem pour un admin nommé depuis /admin
  const fixed = configRole(provider, normalizedEmail);
  const given = stored === "admin" && provider !== "credentials" ? "team" : stored;
  const role = higherRole(fixed, given);
  return {
    id,
    email: normalizedEmail,
    name: pseudo ?? (name || normalizedEmail?.split("@")[0] || "anonyme"),
    hasPseudo: pseudo !== null,
    isTeam: role !== "member",
    isAdmin: role === "admin",
    isOwner: fixed === "admin",
    role,
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
