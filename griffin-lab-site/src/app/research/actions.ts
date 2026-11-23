"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { announceResearch } from "@/lib/discord/announce";
import { consume } from "@/lib/security/rate-limit";
import { toggleLike, type LikeState } from "@/lib/research/likes";
import { canManage, canRead, canWrite } from "@/lib/research/access";
import { MAX_FILES_PER_POST } from "@/lib/research/files";
import { getResearchRepository } from "@/lib/research/repository";
import { readUploads } from "@/lib/research/uploads";
import { firstErrors, groupSchema, memberSchema, postSchema, type FieldErrors } from "@/lib/research/schema";
import type { MemberRole } from "@/lib/research/types";
import { requireViewer } from "@/lib/auth/viewer";

/**
 * Actions serveur des espaces de recherche.
 * Chaque action relit la session et revérifie les droits sur le groupe :
 * l'interface masque les boutons, mais seule cette vérification fait foi.
 */

export type FormState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: FieldErrors;
  values?: Record<string, string>;
};

const text = (form: FormData, key: string) => String(form.get(key) ?? "");

async function loadGroup(id: string) {
  const group = await getResearchRepository().getGroup(id);
  if (!group) throw new Error("Groupe introuvable.");
  return group;
}

/* ---------- Groupes ---------- */

export async function createGroup(_prev: FormState, form: FormData): Promise<FormState> {
  const viewer = await requireViewer("/research/new");
  const values = {
    name: text(form, "name"),
    description: text(form, "description"),
    visibility: text(form, "visibility"),
    kind: text(form, "kind"),
  };
  const parsed = groupSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };

  if (!(await consume(`group:${viewer.id}`, 10, 60 * 60))) {
    return { message: "Trop de groupes créés d'un coup. Réessaie dans une heure.", values };
  }

  // seule l'équipe peut publier dans « Recherches Fleija »
  const kind = values.kind === "official" && viewer.isTeam ? "official" : "community";
  const group = await getResearchRepository().createGroup({
    ...parsed.data,
    kind,
    ownerId: viewer.id,
    ownerName: viewer.name,
  });
  revalidatePath("/research");
  redirect(`/research/${group.id}`);
}

export async function updateGroupSettings(groupId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const viewer = await requireViewer(`/research/${groupId}`);
  const group = await loadGroup(groupId);
  if (!canManage(group, viewer)) return { message: "Seul le propriétaire peut modifier ce groupe." };

  const values = { name: text(form, "name"), description: text(form, "description"), visibility: text(form, "visibility") };
  const parsed = groupSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };

  await getResearchRepository().updateGroup(groupId, parsed.data);
  revalidatePath(`/research/${groupId}`);
  revalidatePath("/research");
  return { ok: true, message: "Réglages enregistrés.", values };
}

export async function deleteGroup(groupId: string) {
  const viewer = await requireViewer(`/research/${groupId}`);
  const group = await loadGroup(groupId);
  if (!canManage(group, viewer)) throw new Error("Seul le propriétaire peut supprimer ce groupe.");
  await getResearchRepository().deleteGroup(groupId);
  revalidatePath("/research");
  redirect("/research");
}

/* ---------- Membres ---------- */

export async function addMember(groupId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const viewer = await requireViewer(`/research/${groupId}`);
  const group = await loadGroup(groupId);
  if (!canManage(group, viewer)) return { message: "Seul le propriétaire peut gérer les membres." };

  const values = { email: text(form, "email"), role: text(form, "role") };
  const parsed = memberSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };

  const { email, role } = parsed.data;
  if (email === viewer.email) return { fieldErrors: { email: "Tu es déjà propriétaire du groupe." }, values };
  if (group.members.some((m) => m.email === email)) {
    return { fieldErrors: { email: "Cette personne est déjà membre." }, values };
  }

  await getResearchRepository().setMembers(groupId, (members) => [
    ...members,
    { email, role, addedAt: new Date().toISOString() },
  ]);
  revalidatePath(`/research/${groupId}`);
  return { ok: true, message: `${email} a été ajouté.` };
}

export async function updateMemberRole(groupId: string, email: string, role: MemberRole) {
  const viewer = await requireViewer(`/research/${groupId}`);
  const group = await loadGroup(groupId);
  if (!canManage(group, viewer) || (role !== "editor" && role !== "viewer")) return;
  await getResearchRepository().setMembers(groupId, (members) =>
    members.map((m) => (m.email === email ? { ...m, role } : m)),
  );
  revalidatePath(`/research/${groupId}`);
}

export async function removeMember(groupId: string, email: string) {
  const viewer = await requireViewer(`/research/${groupId}`);
  const group = await loadGroup(groupId);
  // le propriétaire retire qui il veut ; un membre peut quitter le groupe
  if (!canManage(group, viewer) && viewer.email !== email) return;
  await getResearchRepository().setMembers(groupId, (members) => members.filter((m) => m.email !== email));
  revalidatePath(`/research/${groupId}`);
  revalidatePath("/research");
}

/* ---------- Publications ---------- */

const postValues = (form: FormData) => ({
  title: text(form, "title"),
  category: text(form, "category"),
  summary: text(form, "summary"),
  body: text(form, "body"),
  link: text(form, "link"),
});

export async function createPost(groupId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const viewer = await requireViewer(`/research/${groupId}`);
  const group = await loadGroup(groupId);
  if (!canWrite(group, viewer)) return { message: "Tu n'as pas le droit de publier dans ce groupe." };

  const values = postValues(form);
  const parsed = postSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };

  const files = await readUploads(form, 0, MAX_FILES_PER_POST);
  if (typeof files === "string") return { fieldErrors: { files }, values };

  if (!(await consume(`post:${viewer.id}`, 30, 60 * 60))) {
    return { message: "Trop de publications d'un coup. Réessaie dans une heure.", values };
  }

  const post = await getResearchRepository().createPost(
    { groupId, authorId: viewer.id, authorName: viewer.name, ...parsed.data },
    files,
  );
  after(() => announceResearch(group, post)); // annonce Discord après la réponse
  revalidatePath(`/research/${groupId}`);
  revalidatePath("/research");
  return { ok: true, message: "Publication en ligne." };
}

export async function updatePost(groupId: string, postId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const viewer = await requireViewer(`/research/${groupId}/${postId}`);
  const group = await loadGroup(groupId);
  if (!canWrite(group, viewer)) return { message: "Tu n'as pas le droit de modifier ce groupe." };
  const post = await getResearchRepository().getPost(groupId, postId);
  if (!post) return { message: "Publication introuvable." };

  const values = postValues(form);
  const parsed = postSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };

  const remove = form.getAll("remove").map(String);
  const kept = post.attachments.filter((a) => !remove.includes(a.id)).length;
  const files = await readUploads(form, kept, MAX_FILES_PER_POST);
  if (typeof files === "string") return { fieldErrors: { files }, values };

  if (!(await consume(`post-edit:${viewer.id}`, 60, 60 * 60))) {
    return { message: "Trop de modifications d'un coup. Réessaie dans une heure.", values };
  }

  await getResearchRepository().updatePost(groupId, postId, parsed.data, remove, files);
  revalidatePath(`/research/${groupId}`);
  revalidatePath("/research");
  redirect(`/research/${groupId}/${postId}`);
}

/** Aime ou n'aime plus une publication d'un groupe que la personne peut lire. */
export async function toggleLikeAction(groupId: string, postId: string): Promise<LikeState | null> {
  const viewer = await requireViewer(`/research/${groupId}`);
  const group = await loadGroup(groupId);
  if (!canRead(group, viewer)) return null;
  if (!(await getResearchRepository().listPosts(groupId)).some((post) => post.id === postId)) return null;
  if (!(await consume(`like:${viewer.id}`, 200, 60 * 60))) return null;
  const state = await toggleLike(postId, viewer.id);
  revalidatePath(`/research/${groupId}`);
  revalidatePath(`/research/${groupId}/${postId}`);
  return state;
}

export async function deletePost(groupId: string, postId: string, backToGroup = false) {
  const viewer = await requireViewer(`/research/${groupId}`);
  const group = await loadGroup(groupId);
  if (!canWrite(group, viewer)) return;
  await getResearchRepository().deletePost(groupId, postId);
  revalidatePath(`/research/${groupId}`);
  revalidatePath("/research");
  if (backToGroup) redirect(`/research/${groupId}?edit=1`);
}
