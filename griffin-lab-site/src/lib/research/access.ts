import type { Viewer } from "@/lib/viewer";
import type { ResearchGroup } from "./types";

/**
 * Droits sur un groupe de recherche. Toujours revérifiés côté serveur,
 * dans chaque action et dans la route de téléchargement des fichiers.
 *
 * | rôle          | lire | publier / supprimer | gérer (membres, visibilité, suppression) |
 * | ------------- | ---- | ------------------- | ---------------------------------------- |
 * | propriétaire  | oui  | oui                 | oui                                      |
 * | editor        | oui  | oui                 | non                                      |
 * | viewer        | oui  | non                 | non                                      |
 * | autre         | si public | non            | non                                      |
 */

export type GroupRole = "owner" | "editor" | "viewer";

export function roleOf(group: ResearchGroup, viewer: Viewer | null): GroupRole | null {
  if (!viewer) return null;
  if (group.ownerId === viewer.id) return "owner";
  if (!viewer.email) return null;
  return group.members.find((member) => member.email === viewer.email)?.role ?? null;
}

// un administrateur a tous les droits sur tous les groupes (modération)

export function canRead(group: ResearchGroup, viewer: Viewer | null): boolean {
  return group.visibility === "public" || !!viewer?.isAdmin || roleOf(group, viewer) !== null;
}

export function canWrite(group: ResearchGroup, viewer: Viewer | null): boolean {
  if (viewer?.isAdmin) return true;
  const role = roleOf(group, viewer);
  return role === "owner" || role === "editor";
}

export function canManage(group: ResearchGroup, viewer: Viewer | null): boolean {
  return !!viewer?.isAdmin || roleOf(group, viewer) === "owner";
}
