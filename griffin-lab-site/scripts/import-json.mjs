/**
 * Importe les anciennes données JSON (data/users.json, proposals.json,
 * research.json et data/research-files/) dans la base PostgreSQL.
 *
 *   node scripts/import-json.mjs [dossier]      (par défaut : ./data)
 *
 * - Avec DATABASE_URL : base PostgreSQL ; sinon : base embarquée data/pglite
 *   (arrête le serveur de dev avant, la base embarquée n'accepte qu'un processus).
 * - Le site doit avoir démarré une fois pour créer les tables.
 * - Les lignes déjà présentes (même identifiant) sont ignorées : relançable sans risque.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

const dir = path.resolve(process.argv[2] ?? "data");

async function readJson(name, fallback) {
  try {
    return JSON.parse(await readFile(path.join(dir, name), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function connect() {
  if (process.env.DATABASE_URL) {
    const { default: pg } = await import("pg");
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    return { query: (text, params) => client.query(text, params), close: () => client.end() };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const db = await PGlite.create(path.resolve("data", "pglite"));
  return { query: (text, params) => db.query(text, params), close: () => db.close() };
}

const db = await connect();
const count = { users: 0, proposals: 0, groups: 0, members: 0, posts: 0, files: 0 };
const added = (result) => (result.affectedRows ?? result.rowCount ?? 0) > 0;

try {
  const tables = await db.query("SELECT to_regclass('public.users') AS t");
  if (!tables.rows[0].t) throw new Error("Tables absentes : démarre le site une fois pour créer la base.");

  for (const u of await readJson("users.json", [])) {
    const r = await db.query(
      `INSERT INTO users (id, email, name, password_hash, created_at) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [u.id, u.email.toLowerCase(), u.name, u.passwordHash, u.createdAt],
    );
    if (added(r)) count.users++;
  }

  for (const p of await readJson("proposals.json", [])) {
    const r = await db.query(
      `INSERT INTO proposals (id, author_id, type, pseudo, market, title, description, code,
         paper_title, paper_authors, paper_url, status, score, reason, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) ON CONFLICT DO NOTHING`,
      [
        p.id, p.authorId, p.type, p.pseudo, p.market, p.title, p.description, p.code ?? null,
        p.paper?.title ?? null, p.paper?.authors ?? null, p.paper?.url ?? null,
        p.status, p.score ?? null, p.reason ?? null, p.createdAt, p.updatedAt,
      ],
    );
    if (added(r)) count.proposals++;
  }

  const research = await readJson("research.json", { groups: [], posts: [] });
  for (const g of research.groups ?? []) {
    const r = await db.query(
      `INSERT INTO research_groups (id, name, description, kind, visibility, owner_id, owner_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING`,
      [g.id, g.name, g.description, g.kind, g.visibility, g.ownerId, g.ownerName, g.createdAt, g.updatedAt],
    );
    if (added(r)) count.groups++;
    for (const m of g.members ?? []) {
      const rm = await db.query(
        `INSERT INTO research_members (group_id, email, role, added_at) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
        [g.id, m.email.toLowerCase(), m.role, m.addedAt],
      );
      if (added(rm)) count.members++;
    }
  }

  for (const p of research.posts ?? []) {
    const r = await db.query(
      `INSERT INTO research_posts (id, group_id, author_id, author_name, title, body, link, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING`,
      [p.id, p.groupId, p.authorId, p.authorName, p.title, p.body, p.link ?? null, p.createdAt],
    );
    if (added(r)) count.posts++;
    for (const [position, a] of (p.attachments ?? []).entries()) {
      let data;
      try {
        data = await readFile(path.join(dir, "research-files", a.id));
      } catch {
        console.warn(`Fichier manquant, ignoré : ${a.name} (${a.id})`);
        continue;
      }
      const ra = await db.query(
        `INSERT INTO research_attachments (id, post_id, position, name, size, mime, kind, data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING`,
        [a.id, p.id, position, a.name, a.size, a.mime, a.kind, data],
      );
      if (added(ra)) count.files++;
    }
  }

  console.log("Importé :", count);
} finally {
  await db.close();
}
