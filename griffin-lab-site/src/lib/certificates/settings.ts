import "server-only";
import { getDb, isUuid } from "@/lib/db";
import { resolveIdentities } from "@/lib/users/identity";
import type { Viewer } from "@/lib/auth/viewer";

/**
 * Certificats : un par proposition validée. Son auteur peut l'afficher sur son
 * profil public (`certificate_public`) et le publier une fois dans #certificates sur
 * Discord (`certificate_posted_at`).
 */

export type Certificate = {
  id: string;
  authorId: string;
  title: string;
  pseudo: string;
  score: number | null;
  validatedAt: string;
  public: boolean;
  postedAt: string | null;
};

type Row = {
  id: string;
  author_id: string;
  title: string;
  pseudo: string;
  score: number | null;
  validated_at: Date | null;
  updated_at: Date;
  certificate_public: boolean;
  certificate_posted_at: Date | null;
};

const COLUMNS = "id, author_id, title, pseudo, score, validated_at, updated_at, certificate_public, certificate_posted_at";

const toCertificate = (row: Row): Certificate => ({
  id: row.id,
  authorId: row.author_id,
  title: row.title,
  pseudo: row.pseudo,
  score: row.score === null ? null : Number(row.score),
  validatedAt: new Date(row.validated_at ?? row.updated_at).toISOString(),
  public: row.certificate_public,
  postedAt: row.certificate_posted_at ? new Date(row.certificate_posted_at).toISOString() : null,
});

/** Le certificat d'une proposition validée, ou `null`. */
export async function getCertificate(id: string): Promise<Certificate | null> {
  if (!isUuid(id)) return null;
  const db = await getDb();
  const [row] = await db.query<Row>(`SELECT ${COLUMNS} FROM proposals WHERE id = $1 AND status = 'validated'`, [id]);
  return row ? toCertificate(row) : null;
}

/** Certificats d'un compte (les plus récents d'abord) ; `onlyPublic` pour son profil public. */
export async function listCertificates(userKey: string, onlyPublic = false): Promise<Certificate[]> {
  const db = await getDb();
  const rows = await db.query<Row>(
    `SELECT ${COLUMNS} FROM proposals
     WHERE author_id = $1 AND status = 'validated' ${onlyPublic ? "AND certificate_public" : ""}
     ORDER BY coalesce(validated_at, updated_at) DESC`,
    [userKey],
  );
  return rows.map(toCertificate);
}

/** Affiche ou masque un de ses certificats sur son profil public. */
export async function setCertificatePublic(userKey: string, id: string, visible: boolean): Promise<boolean> {
  if (!isUuid(id)) return false;
  const db = await getDb();
  const rows = await db.query(
    `UPDATE proposals SET certificate_public = $3 WHERE id = $1 AND author_id = $2 AND status = 'validated' RETURNING id`,
    [id, userKey, visible],
  );
  return rows.length > 0;
}

/** Réserve la publication dans #certificates (une seule fois par certificat). `false` si déjà publié. */
export async function claimPost(userKey: string, id: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  const db = await getDb();
  const rows = await db.query(
    `UPDATE proposals SET certificate_posted_at = now()
     WHERE id = $1 AND author_id = $2 AND status = 'validated' AND certificate_posted_at IS NULL RETURNING id`,
    [id, userKey],
  );
  return rows.length > 0;
}

/** Annule la réservation si l'envoi sur Discord a échoué (pour pouvoir réessayer). */
export async function releasePost(userKey: string, id: string): Promise<void> {
  const db = await getDb();
  await db.query("UPDATE proposals SET certificate_posted_at = NULL WHERE id = $1 AND author_id = $2", [id, userKey]);
}

/**
 * Qui peut voir un certificat : son auteur, l'équipe et les admins ; tout le
 * monde s'il est public ET que le pseudo de l'auteur est visible pour cette
 * personne (un compte anonyme ne se révèle pas par son certificat).
 */
export async function canViewCertificate(certificate: Certificate, viewer: Viewer | null): Promise<boolean> {
  if (viewer && (viewer.id === certificate.authorId || viewer.isAdmin || viewer.isTeam)) return true;
  if (!certificate.public) return false;
  const identity = (await resolveIdentities([certificate.authorId], viewer)).get(certificate.authorId);
  return !!identity && !identity.anonymous;
}
