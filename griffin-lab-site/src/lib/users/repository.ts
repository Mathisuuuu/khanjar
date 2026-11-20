import "server-only";
import { randomUUID } from "node:crypto";
import { getDb, iso } from "@/lib/db";

/**
 * Comptes créés avec e-mail + mot de passe (table `users`).
 * Les comptes Discord, Google, Apple et GitHub n'ont rien à stocker ici :
 * la session (JWT signé) porte leur identité ; seul leur pseudo est en base (profiles).
 */

export type User = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  /** `null` tant que la personne n'a pas cliqué sur le lien reçu par e-mail. */
  emailVerifiedAt: string | null;
  createdAt: string;
};

export type CreateUserResult = { user: User } | { conflict: "email" | "pseudo" };

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  updatePassword(id: string, passwordHash: string): Promise<void>;
  /** Crée le compte et son pseudo (non vérifié). */
  create(input: Pick<User, "email" | "name" | "passwordHash">): Promise<CreateUserResult>;
}

type UserRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  email_verified_at: Date | null;
  created_at: Date;
};

const toUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  name: row.name,
  passwordHash: row.password_hash,
  emailVerifiedAt: row.email_verified_at ? iso(row.email_verified_at) : null,
  createdAt: iso(row.created_at),
});

class PostgresUserRepository implements UserRepository {
  async findByEmail(email: string) {
    const db = await getDb();
    const [row] = await db.query<UserRow>("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
    return row ? toUser(row) : null;
  }

  async findById(id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const db = await getDb();
    const [row] = await db.query<UserRow>("SELECT * FROM users WHERE id = $1", [id]);
    return row ? toUser(row) : null;
  }

  async updatePassword(id: string, passwordHash: string) {
    const db = await getDb();
    await db.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, id]);
  }

  async create(input: Pick<User, "email" | "name" | "passwordHash">): Promise<CreateUserResult> {
    const db = await getDb();
    return db.transaction(async (tx) => {
      const [row] = await tx.query<UserRow>(
        `INSERT INTO users (id, email, name, password_hash) VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO NOTHING RETURNING *`,
        [randomUUID(), input.email.toLowerCase(), input.name, input.passwordHash],
      );
      if (!row) return { conflict: "email" as const };
      const profile = await tx.query(
        "INSERT INTO profiles (user_key, pseudo) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING user_key",
        [`credentials:${row.id}`, input.name],
      );
      // pseudo déjà pris : on annule aussi la création du compte
      if (profile.length === 0) throw new PseudoTaken();
      return { user: toUser(row) };
    }).catch((error: unknown) => {
      if (error instanceof PseudoTaken) return { conflict: "pseudo" as const };
      throw error;
    });
  }
}

class PseudoTaken extends Error {}

let repository: UserRepository | undefined;

export function getUserRepository(): UserRepository {
  repository ??= new PostgresUserRepository();
  return repository;
}
