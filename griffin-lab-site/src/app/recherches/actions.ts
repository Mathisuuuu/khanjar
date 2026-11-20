"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { consume } from "@/lib/rate-limit";
import { toggleLike, type LikeState } from "@/lib/likes";
import { canManage, canRead, canWrite } from "@/lib/research/access";
import { cleanFileName, fileTypeOf, formatFileSize, MAX_FILE_SIZE, MAX_FILES_PER_POST } from "@/lib/research/files";
import { getResearchRepository, type NewAttachment } from "@/lib/research/repository";
import { firstErrors, groupSchema, memberSchema, postSchema, type FieldErrors } from "@/lib/research/schema";
import type { MemberRole } from "@/lib/research/types";
import { requireViewer } from "@/lib/viewer";

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
  const viewer = await requireViewer("/recherches/nouveau");
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

  // seule l'équipe peut publier dans « Recherches Griffin Lab »
  const kind = values.kind === "official" && viewer.isTeam ? "official" : "community";
  const group = await getResearchRepository().createGroup({
    ...parsed.data,
    kind,
    ownerId: viewer.id,
    ownerName: viewer.name,
  });
  revalidatePath("/recherches");
  redirect(`/recherches/${group.id}`);
}

export async function updateGroupSettings(groupId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const viewer = await requireViewer(`/recherches/${groupId}`);
  const group = await loadGroup(groupId);
  if (!canManage(group, viewer)) return { message: "Seul le propriétaire peut modifier ce groupe." };

  const values = { name: text(form, "name"), description: text(form, "description"), visibility: text(form, "visibility") };
  const parsed = groupSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };

  await getResearchRepository().updateGroup(groupId, parsed.data);
  revalidatePath(`/recherches/${groupId}`);
  revalidatePath("/recherches");
  return { ok: true, message: "Réglages enregistrés.", values };
}

export async function deleteGroup(groupId: string) {
  const viewer = await requireViewer(`/recherches/${groupId}`);
  const group = await loadGroup(groupId);
  if (!canManage(group, viewer)) throw new Error("Seul le propriétaire peut supprimer ce groupe.");
  await getResearchRepository().deleteGroup(groupId);
  revalidatePath("/recherches");
  redirect("/recherches");
}

/* ---------- Membres ---------- */

export async function addMember(groupId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const viewer = await requireViewer(`/recherches/${groupId}`);
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
  revalidatePath(`/recherches/${groupId}`);
  return { ok: true, message: `${email} a été ajouté.` };
}

export async function updateMemberRole(groupId: string, email: string, role: MemberRole) {
  const viewer = await requireViewer(`/recherches/${groupId}`);
  const group = await loadGroup(groupId);
  if (!canManage(group, viewer) || (role !== "editor" && role !== "viewer")) return;
  await getResearchRepository().setMembers(groupId, (members) =>
    members.map((m) => (m.email === email ? { ...m, role } : m)),
  );
  revalidatePath(`/recherches/${groupId}`);
}

export async function removeMember(groupId: string, email: string) {
  const viewer = await requireViewer(`/recherches/${groupId}`);
  const group = await loadGroup(groupId);
  // le propriétaire retire qui il veut ; un membre peut quitter le groupe
  if (!canManage(group, viewer) && viewer.email !== email) return;
  await getResearchRepository().setMembers(groupId, (members) => members.filter((m) => m.email !== email));
  revalidatePath(`/recherches/${groupId}`);
  revalidatePath("/recherches");
}

/* ---------- Publications ---------- */

export async function createPost(groupId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const viewer = await requireViewer(`/recherches/${groupId}`);
  const group = await loadGroup(groupId);
  if (!canWrite(group, viewer)) return { message: "Tu n'as pas le droit de publier dans ce groupe." };

  const values = { title: text(form, "title"), body: text(form, "body"), link: text(form, "link") };
  const parsed = postSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };

  const uploads = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (uploads.length > MAX_FILES_PER_POST) {
    return { fieldErrors: { files: `${MAX_FILES_PER_POST} fichiers maximum par publication.` }, values };
  }

  const files: NewAttachment[] = [];
  for (const file of uploads) {
    const type = fileTypeOf(file.name);
    if (!type) return { fieldErrors: { files: `Type de fichier non accepté : ${file.name}` }, values };
    if (file.size > MAX_FILE_SIZE) {
      return { fieldErrors: { files: `${file.name} dépasse ${formatFileSize(MAX_FILE_SIZE)}.` }, values };
    }
    const data = Buffer.from(await file.arrayBuffer());
    // un « PDF » doit vraiment en être un : il est affiché dans le navigateur
    if (type.kind === "pdf" && data.subarray(0, 5).toString("latin1") !== "%PDF-") {
      return { fieldErrors: { files: `${file.name} n'est pas un PDF valide.` }, values };
    }
    files.push({ name: cleanFileName(file.name), size: file.size, mime: type.mime, kind: type.kind, data });
  }

  if (!(await consume(`post:${viewer.id}`, 30, 60 * 60))) {
    return { message: "Trop de publications d'un coup. Réessaie dans une heure.", values };
  }

  await getResearchRepository().createPost(
    { groupId, authorId: viewer.id, authorName: viewer.name, title: parsed.data.title, body: parsed.data.body, link: parsed.data.link },
    files,
  );
  revalidatePath(`/recherches/${groupId}`);
  revalidatePath("/recherches");
  return { ok: true, message: "Publication en ligne." };
}

/** Aime ou n'aime plus une publication d'un groupe que la personne peut lire. */
export async function toggleLikeAction(groupId: string, postId: string): Promise<LikeState | null> {
  const viewer = await requireViewer(`/recherches/${groupId}`);
  const group = await loadGroup(groupId);
  if (!canRead(group, viewer)) return null;
  if (!(await getResearchRepository().listPosts(groupId)).some((post) => post.id === postId)) return null;
  if (!(await consume(`like:${viewer.id}`, 200, 60 * 60))) return null;
  const state = await toggleLike(postId, viewer.id);
  revalidatePath(`/recherches/${groupId}`);
  return state;
}

export async function deletePost(groupId: string, postId: string) {
  const viewer = await requireViewer(`/recherches/${groupId}`);
  const group = await loadGroup(groupId);
  if (!canWrite(group, viewer)) return;
  await getResearchRepository().deletePost(groupId, postId);
  revalidatePath(`/recherches/${groupId}`);
  revalidatePath("/recherches");
}
