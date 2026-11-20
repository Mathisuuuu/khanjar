import "server-only";
import path from "node:path";
import { migrate } from "./migrations";

/**
 * Accès à la base PostgreSQL.
 * - Production : serveur PostgreSQL désigné par DATABASE_URL (pilote `pg`).
 * - Développement sans DATABASE_URL : PostgreSQL embarqué (PGlite) dans
 *   ./data/pglite, rien à installer. Mêmes requêtes SQL dans les deux cas.
 * Toutes les requêtes passent des paramètres ($1, $2…) : jamais de valeur
 * concaténée dans le SQL.
 */

export type Row = Record<string, unknown>;

export interface Queryable {
  query<T extends Row = Row>(text: string, params?: unknown[]): Promise<T[]>;
}

export interface Database extends Queryable {
  /** Exécute `fn` dans une transaction : tout est validé, ou rien en cas d'erreur. */
  transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
}

async function connectPostgres(url: string): Promise<Database> {
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: url, max: 10, idleTimeoutMillis: 30_000 });
  pool.on("error", (error) => console.error("PostgreSQL :", error.message));
  return {
    async query(text, params) {
      return (await pool.query(text, params)).rows;
    },
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await fn({ query: async (text, params) => (await client.query(text, params)).rows });
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

async function connectEmbedded(directory: string): Promise<Database> {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = await PGlite.create(directory);
  return {
    async query<T extends Row>(text: string, params?: unknown[]) {
      return (await db.query<T>(text, params)).rows;
    },
    transaction(fn) {
      return db.transaction((tx) =>
        fn({ query: async <T extends Row>(text: string, params?: unknown[]) => (await tx.query<T>(text, params)).rows }),
      );
    },
  };
}

async function connect(): Promise<Database> {
  const url = process.env.DATABASE_URL;
  let db: Database;
  if (url) {
    db = await connectPostgres(url);
  } else if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL manquant : la production a besoin d'un serveur PostgreSQL.");
  } else {
    db = await connectEmbedded(path.resolve("data", "pglite"));
  }
  await migrate(db);
  return db;
}

// une seule connexion par processus (gardée entre les rechargements du serveur de dev)
const globalDb = globalThis as typeof globalThis & { __griffinDb?: Promise<Database> };

export function getDb(): Promise<Database> {
  globalDb.__griffinDb ??= connect().catch((error) => {
    globalDb.__griffinDb = undefined; // nouvel essai à la prochaine requête
    throw error;
  });
  return globalDb.__griffinDb;
}

/* ---------- Conversions communes ---------- */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Évite une erreur SQL sur un identifiant mal formé venant d'une URL. */
export const isUuid = (value: string) => UUID.test(value);

export const iso = (value: unknown) => (value instanceof Date ? value : new Date(String(value))).toISOString();

export const optional = <T>(value: T | null | undefined): T | undefined => value ?? undefined;
