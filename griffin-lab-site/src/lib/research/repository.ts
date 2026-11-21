import "server-only";
import { randomUUID } from "node:crypto";
import { getDb, iso, isUuid, optional, type Queryable } from "@/lib/db";
import type { Attachment, AttachmentKind, Member, MemberRole, PostContent, ResearchGroup, ResearchPost } from "./types";

/**
 * Stockage des groupes, membres, publications et pièces jointes (tables
 * `research_*`). Le contenu des fichiers est aussi dans la base, mais n'est
 * lu que par `readAttachment` (téléchargement).
 */

export type NewAttachment = Omit<Attachment, "id"> & { data: Buffer };

/** Groupe vu dans la liste : nombre de publications et derniers PDF (3 au plus). */
export type GroupSummary = ResearchGroup & { postCount: number; pdfs: { id: string; name: string }[] };

export interface ResearchRepository {
  listGroups(): Promise<GroupSummary[]>;
  getGroup(id: string): Promise<ResearchGroup | null>;
  createGroup(input: Omit<ResearchGroup, "id" | "members" | "createdAt" | "updatedAt">): Promise<ResearchGroup>;
  updateGroup(id: string, patch: Partial<Pick<ResearchGroup, "name" | "description" | "visibility">>): Promise<void>;
  setMembers(id: string, change: (members: Member[]) => Member[]): Promise<void>;
  deleteGroup(id: string): Promise<void>;

  listPosts(groupId: string): Promise<ResearchPost[]>;
  createPost(input: Omit<ResearchPost, "id" | "attachments" | "createdAt">, files: NewAttachment[]): Promise<ResearchPost>;
  getPost(groupId: string, postId: string): Promise<ResearchPost | null>;
  /** Modifie le contenu, retire des pièces jointes et en ajoute de nouvelles. */
  updatePost(groupId: string, postId: string, content: PostContent, removeIds: string[], files: NewAttachment[]): Promise<void>;
  deletePost(groupId: string, postId: string): Promise<void>;

  /** Retrouve une pièce jointe, son groupe et son contenu (pour le téléchargement). */
  readAttachment(id: string): Promise<{ group: ResearchGroup; attachment: Attachment; data: Buffer } | null>;
}

type GroupRow = {
  id: string;
  name: string;
  description: string;
  kind: ResearchGroup["kind"];
  visibility: ResearchGroup["visibility"];
  owner_id: string;
  owner_name: string;
  created_at: Date;
  updated_at: Date;
};
type MemberRow = { group_id: string; email: string; role: MemberRole; added_at: Date };
type PostRow = {
  id: string;
  group_id: string;
  author_id: string;
  author_name: string;
  title: string;
  category: string | null;
  summary: string | null;
  body: string;
  link: string | null;
  created_at: Date;
  updated_at: Date | null;
};
type AttachmentRow = { id: string; post_id: string; name: string; size: number; mime: string; kind: AttachmentKind };

/** Colonnes des pièces jointes sans leur contenu. */
const ATTACHMENT_COLUMNS = "a.id, a.post_id, a.name, a.size, a.mime, a.kind";

const toMember = (row: MemberRow): Member => ({ email: row.email, role: row.role, addedAt: iso(row.added_at) });

const toGroup = (row: GroupRow, members: Member[]): ResearchGroup => ({
  id: row.id,
  name: row.name,
  description: row.description,
  kind: row.kind,
  visibility: row.visibility,
  ownerId: row.owner_id,
  ownerName: row.owner_name,
  members,
  createdAt: iso(row.created_at),
  updatedAt: iso(row.updated_at),
});

const toAttachment = (row: AttachmentRow): Attachment => ({
  id: row.id,
  name: row.name,
  size: Number(row.size),
  mime: row.mime,
  kind: row.kind,
});

const toPost = (row: PostRow, attachments: Attachment[]): ResearchPost => ({
  id: row.id,
  groupId: row.group_id,
  authorId: row.author_id,
  authorName: row.author_name,
  title: row.title,
  category: optional(row.category),
  summary: optional(row.summary),
  body: row.body,
  link: optional(row.link),
  attachments,
  createdAt: iso(row.created_at),
  updatedAt: row.updated_at ? iso(row.updated_at) : undefined,
});

async function insertAttachments(db: Queryable, postId: string, files: NewAttachment[], start: number) {
  const attachments: Attachment[] = [];
  for (const [index, { data, ...meta }] of files.entries()) {
    const attachment: Attachment = { ...meta, id: randomUUID() };
    await db.query(
      `INSERT INTO research_attachments (id, post_id, position, name, size, mime, kind, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [attachment.id, postId, start + index, attachment.name, attachment.size, attachment.mime, attachment.kind, data],
    );
    attachments.push(attachment);
  }
  return attachments;
}

async function membersOf(db: Queryable, groupId: string): Promise<Member[]> {
  const rows = await db.query<MemberRow>("SELECT * FROM research_members WHERE group_id = $1 ORDER BY added_at", [
    groupId,
  ]);
  return rows.map(toMember);
}

class PostgresResearchRepository implements ResearchRepository {
  async listGroups() {
    const db = await getDb();
    const [groups, members, counts, pdfs] = await Promise.all([
      db.query<GroupRow>("SELECT * FROM research_groups ORDER BY updated_at DESC"),
      db.query<MemberRow>("SELECT * FROM research_members ORDER BY added_at"),
      db.query<{ group_id: string; n: number }>(
        "SELECT group_id, count(*)::int AS n FROM research_posts GROUP BY group_id",
      ),
      // les 3 PDF les plus récents de chaque groupe
      db.query<{ id: string; name: string; group_id: string }>(
        `SELECT id, name, group_id FROM (
           SELECT a.id, a.name, p.group_id,
                  row_number() OVER (PARTITION BY p.group_id ORDER BY p.created_at DESC, a.position) AS rank
           FROM research_attachments a JOIN research_posts p ON p.id = a.post_id
           WHERE a.kind = 'pdf'
         ) ranked
         WHERE rank <= 3 ORDER BY group_id, rank`,
      ),
    ]);

    return groups.map((row) => ({
      ...toGroup(
        row,
        members.filter((m) => m.group_id === row.id).map(toMember),
      ),
      postCount: Number(counts.find((c) => c.group_id === row.id)?.n ?? 0),
      pdfs: pdfs.filter((pdf) => pdf.group_id === row.id).map(({ id, name }) => ({ id, name })),
    }));
  }

  async getGroup(id: string) {
    if (!isUuid(id)) return null;
    const db = await getDb();
    const [row] = await db.query<GroupRow>("SELECT * FROM research_groups WHERE id = $1", [id]);
    return row ? toGroup(row, await membersOf(db, id)) : null;
  }

  async createGroup(input: Omit<ResearchGroup, "id" | "members" | "createdAt" | "updatedAt">) {
    const db = await getDb();
    const [row] = await db.query<GroupRow>(
      `INSERT INTO research_groups (id, name, description, kind, visibility, owner_id, owner_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [randomUUID(), input.name, input.description, input.kind, input.visibility, input.ownerId, input.ownerName],
    );
    return toGroup(row, []);
  }

  async updateGroup(id: string, patch: Partial<Pick<ResearchGroup, "name" | "description" | "visibility">>) {
    if (!isUuid(id)) return;
    const db = await getDb();
    await db.query(
      `UPDATE research_groups SET
         name = coalesce($2, name),
         description = coalesce($3, description),
         visibility = coalesce($4, visibility),
         updated_at = now()
       WHERE id = $1`,
      [id, patch.name ?? null, patch.description ?? null, patch.visibility ?? null],
    );
  }

  async setMembers(id: string, change: (members: Member[]) => Member[]) {
    if (!isUuid(id)) return;
    const db = await getDb();
    await db.transaction(async (tx) => {
      // verrouille le groupe : deux changements simultanés ne s'écrasent pas
      const locked = await tx.query("SELECT id FROM research_groups WHERE id = $1 FOR UPDATE", [id]);
      if (locked.length === 0) return;
      const next = change(await membersOf(tx, id));
      await tx.query("DELETE FROM research_members WHERE group_id = $1", [id]);
      for (const member of next) {
        await tx.query(
          `INSERT INTO research_members (group_id, email, role, added_at) VALUES ($1, $2, $3, $4)
           ON CONFLICT (group_id, email) DO UPDATE SET role = EXCLUDED.role`,
          [id, member.email.toLowerCase(), member.role, member.addedAt],
        );
      }
      await tx.query("UPDATE research_groups SET updated_at = now() WHERE id = $1", [id]);
    });
  }

  async deleteGroup(id: string) {
    if (!isUuid(id)) return;
    const db = await getDb();
    // membres, publications et fichiers suivent (ON DELETE CASCADE)
    await db.query("DELETE FROM research_groups WHERE id = $1", [id]);
  }

  async listPosts(groupId: string) {
    if (!isUuid(groupId)) return [];
    const db = await getDb();
    const [posts, attachments] = await Promise.all([
      db.query<PostRow>("SELECT * FROM research_posts WHERE group_id = $1 ORDER BY created_at DESC", [groupId]),
      db.query<AttachmentRow>(
        `SELECT ${ATTACHMENT_COLUMNS} FROM research_attachments a
         JOIN research_posts p ON p.id = a.post_id
         WHERE p.group_id = $1 ORDER BY a.position`,
        [groupId],
      ),
    ]);
    return posts.map((row) => toPost(row, attachments.filter((a) => a.post_id === row.id).map(toAttachment)));
  }

  async createPost(input: Omit<ResearchPost, "id" | "attachments" | "createdAt">, files: NewAttachment[]) {
    const db = await getDb();
    return db.transaction(async (tx) => {
      const [row] = await tx.query<PostRow>(
        `INSERT INTO research_posts (id, group_id, author_id, author_name, title, category, summary, body, link)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          randomUUID(),
          input.groupId,
          input.authorId,
          input.authorName,
          input.title,
          input.category ?? null,
          input.summary ?? null,
          input.body,
          input.link ?? null,
        ],
      );
      const attachments = await insertAttachments(tx, row.id, files, 0);
      await tx.query("UPDATE research_groups SET updated_at = now() WHERE id = $1", [input.groupId]);
      return toPost(row, attachments);
    });
  }

  async getPost(groupId: string, postId: string) {
    if (!isUuid(groupId) || !isUuid(postId)) return null;
    const db = await getDb();
    const [row] = await db.query<PostRow>("SELECT * FROM research_posts WHERE id = $1 AND group_id = $2", [
      postId,
      groupId,
    ]);
    if (!row) return null;
    const attachments = await db.query<AttachmentRow>(
      `SELECT ${ATTACHMENT_COLUMNS} FROM research_attachments a WHERE a.post_id = $1 ORDER BY a.position`,
      [postId],
    );
    return toPost(row, attachments.map(toAttachment));
  }

  async updatePost(groupId: string, postId: string, content: PostContent, removeIds: string[], files: NewAttachment[]) {
    if (!isUuid(groupId) || !isUuid(postId)) return;
    const db = await getDb();
    await db.transaction(async (tx) => {
      const updated = await tx.query<{ id: string }>(
        `UPDATE research_posts SET title = $3, category = $4, summary = $5, body = $6, link = $7, updated_at = now()
         WHERE id = $1 AND group_id = $2 RETURNING id`,
        [postId, groupId, content.title, content.category ?? null, content.summary ?? null, content.body, content.link ?? null],
      );
      if (!updated.length) return;
      const ids = removeIds.filter(isUuid);
      if (ids.length) {
        await tx.query("DELETE FROM research_attachments WHERE post_id = $1 AND id = ANY($2::uuid[])", [postId, ids]);
      }
      const [{ next }] = await tx.query<{ next: number }>(
        "SELECT coalesce(max(position) + 1, 0)::int AS next FROM research_attachments WHERE post_id = $1",
        [postId],
      );
      await insertAttachments(tx, postId, files, Number(next));
      await tx.query("UPDATE research_groups SET updated_at = now() WHERE id = $1", [groupId]);
    });
  }

  async deletePost(groupId: string, postId: string) {
    if (!isUuid(groupId) || !isUuid(postId)) return;
    const db = await getDb();
    await db.query("DELETE FROM research_posts WHERE id = $1 AND group_id = $2", [postId, groupId]);
  }

  async readAttachment(id: string) {
    if (!isUuid(id)) return null;
    const db = await getDb();
    const [row] = await db.query<AttachmentRow & { group_id: string; data: Uint8Array }>(
      `SELECT ${ATTACHMENT_COLUMNS}, a.data, p.group_id FROM research_attachments a
       JOIN research_posts p ON p.id = a.post_id WHERE a.id = $1`,
      [id],
    );
    if (!row) return null;
    const group = await this.getGroup(row.group_id);
    if (!group) return null;
    return { group, attachment: toAttachment(row), data: Buffer.from(row.data) };
  }
}

let repository: ResearchRepository | undefined;

export function getResearchRepository(): ResearchRepository {
  repository ??= new PostgresResearchRepository();
  return repository;
}
