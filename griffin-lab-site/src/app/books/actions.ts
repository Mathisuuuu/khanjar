"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  addBookMember,
  createBook,
  deleteBook,
  getBook,
  listBookMembers,
  removeBookMember,
  setStrategyAccess,
  updateBook,
} from "@/lib/books/repository";
import { saveStrategy, strategyFileIds } from "@/lib/books/strategies";
import { getDb } from "@/lib/db";
import { getAvatars } from "@/lib/discord/links";
import { getProposalRepository } from "@/lib/proposals/repository";
import { readUploads } from "@/lib/research/uploads";
import { consume } from "@/lib/security/rate-limit";
import { requireViewer } from "@/lib/auth/viewer";

/**
 * Actions des books. La gestion (création, membres, chiffres) est réservée à
 * l'équipe Fleija et aux admins ; chaque membre peut décrire sa propre
 * stratégie. L'interface masque ces formulaires aux autres, mais seule la
 * vérification ici fait foi.
 */

export type BookFormState = { ok?: boolean; message?: string; fieldErrors?: Record<string, string>; values?: Record<string, string> };

const bookSchema = z.object({
  name: z.string().trim().min(2, "2 caractères minimum.").max(60, "60 caractères maximum."),
  description: z.string().trim().max(300, "300 caractères maximum."),
  color: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^#[0-9a-f]{6}$/, "Couleur invalide."),
});

const text = (form: FormData, key: string) => String(form.get(key) ?? "");

async function requireTeam(returnTo: string) {
  const viewer = await requireViewer(returnTo);
  if (!viewer.isTeam && !viewer.isAdmin) throw new Error("Réservé à l'équipe Fleija.");
  return viewer;
}

function errorsOf(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) errors[String(issue.path[0])] ??= issue.message;
  return errors;
}

function revalidateBooks(id?: string) {
  revalidatePath("/books");
  if (id) revalidatePath(`/books/${id}`);
}

export async function createBookAction(_prev: BookFormState, form: FormData): Promise<BookFormState> {
  const viewer = await requireTeam("/books");
  const values = { name: text(form, "name"), description: text(form, "description"), color: text(form, "color") };
  const parsed = bookSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: errorsOf(parsed.error), values };
  if (!(await consume(`book:${viewer.id}`, 20, 60 * 60))) return { message: "Trop de books créés d'un coup.", values };

  const id = await createBook({ ...parsed.data, createdBy: viewer.id });
  revalidateBooks();
  redirect(`/books/${id}`);
}

/** Nombre décimal saisi en français (« 7,4 ») ou vide. */
const decimal = (min: number, max: number) =>
  z
    .string()
    .trim()
    .transform((value) => value.replace(",", "."))
    .refine((value) => value === "" || (Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max), {
      message: `Entre ${min} et ${max}.`,
    });

const statsSchema = z.object({
  strategies: decimal(0, 999).refine((v) => v === "" || Number.isInteger(Number(v)), "Nombre entier."),
  sharpe: decimal(-20, 20),
  maxDrawdown: decimal(-100, 0),
  dailyReturn: decimal(-100, 100),
});
// facultatif : rendement depuis le lancement
const allTimeSchema = decimal(-100, 1_000_000);

export async function updateBookAction(bookId: string, _prev: BookFormState, form: FormData): Promise<BookFormState> {
  await requireTeam(`/books/${bookId}`);
  const values = {
    name: text(form, "name"),
    description: text(form, "description"),
    color: text(form, "color"),
    strategies: text(form, "strategies"),
    sharpe: text(form, "sharpe"),
    maxDrawdown: text(form, "maxDrawdown"),
    dailyReturn: text(form, "dailyReturn"),
    allTime: text(form, "allTime"),
  };
  const parsed = bookSchema.safeParse(values);
  const parsedStats = statsSchema.safeParse(values);
  const parsedAllTime = allTimeSchema.safeParse(values.allTime);
  if (!parsed.success || !parsedStats.success || !parsedAllTime.success) {
    return {
      fieldErrors: {
        ...(parsed.success ? {} : errorsOf(parsed.error)),
        ...(parsedStats.success ? {} : errorsOf(parsedStats.error)),
        ...(parsedAllTime.success ? {} : { allTime: parsedAllTime.error.issues[0]?.message ?? "Valeur invalide." }),
      },
      values,
    };
  }
  // les quatre chiffres vont ensemble
  const numbers = Object.values(parsedStats.data);
  if (numbers.some((v) => v === "") && numbers.some((v) => v !== "")) {
    return { message: "Renseigne les quatre chiffres, ou aucun.", values };
  }
  const stats = numbers.every((v) => v !== "")
    ? {
        strategies: Number(parsedStats.data.strategies),
        sharpe: Number(parsedStats.data.sharpe),
        maxDrawdown: Number(parsedStats.data.maxDrawdown),
        dailyReturn: Number(parsedStats.data.dailyReturn),
        allTime: parsedAllTime.data === "" ? null : Number(parsedAllTime.data),
        allTimeAt: null,
      }
    : null;

  if (!(await getBook(bookId))) return { message: "Book introuvable." };
  await updateBook(bookId, { ...parsed.data, stats });
  revalidateBooks(bookId);
  revalidatePath("/"); // l'accueil affiche les chiffres des books A, B, C
  return { ok: true, message: "Enregistré." };
}

export async function deleteBookAction(bookId: string) {
  await requireTeam(`/books/${bookId}`);
  await deleteBook(bookId);
  revalidateBooks(bookId);
  redirect("/books");
}

/** Ajoute un membre à partir de son pseudo. */
export async function addBookMemberAction(bookId: string, _prev: BookFormState, form: FormData): Promise<BookFormState> {
  const viewer = await requireTeam(`/books/${bookId}`);
  const pseudo = text(form, "pseudo").trim().replace(/^@/, "");
  if (!pseudo) return { fieldErrors: { pseudo: "Indique un pseudo." } };
  if (!(await consume(`book-member:${viewer.id}`, 120, 60 * 60))) return { message: "Trop d'ajouts d'un coup." };
  if (!(await getBook(bookId))) return { message: "Book introuvable." };

  const db = await getDb();
  const [profile] = await db.query<{ user_key: string; pseudo: string }>(
    `SELECT p.user_key, p.pseudo FROM profiles p
     WHERE lower(p.pseudo) = lower($1) AND NOT EXISTS (SELECT 1 FROM banned_accounts b WHERE b.user_key = p.user_key)`,
    [pseudo],
  );
  if (!profile) return { fieldErrors: { pseudo: "Aucun compte avec ce pseudo." }, values: { pseudo } };

  await addBookMember(bookId, profile.user_key);
  revalidateBooks(bookId);
  return { ok: true, message: `${profile.pseudo} a maintenant accès à ce book.` };
}

export type MemberSuggestion = { pseudo: string; avatar: string | null };

/**
 * Suggestions pour le champ « Ajouter un membre » : les comptes dont le pseudo
 * contient le texte tapé (sans tenir compte de la casse), hors comptes bannis et
 * membres déjà dans ce book. Ceux qui commencent par le texte passent en premier.
 */
export async function searchBookMemberAction(bookId: string, query: string): Promise<MemberSuggestion[]> {
  const viewer = await requireTeam(`/books/${bookId}`);
  const q = String(query ?? "").trim().replace(/^@/, "").slice(0, 40);
  if (!q) return [];
  if (!(await consume(`book-member-search:${viewer.id}`, 600, 60 * 60))) return [];

  // %, _ et \ tapés sont cherchés tels quels, pas comme jokers
  const like = q.replace(/[\\%_]/g, (c) => `\\${c}`);
  const db = await getDb();
  const rows = await db.query<{ user_key: string; pseudo: string }>(
    `SELECT p.user_key, p.pseudo FROM profiles p
     WHERE p.pseudo ILIKE '%' || $1 || '%'
       AND NOT EXISTS (SELECT 1 FROM banned_accounts b WHERE b.user_key = p.user_key)
       AND NOT EXISTS (SELECT 1 FROM book_members m WHERE m.book_id::text = $2 AND m.user_key = p.user_key)
     ORDER BY (lower(p.pseudo) LIKE lower($1) || '%') DESC, lower(p.pseudo)
     LIMIT 8`,
    [like, bookId],
  );
  const avatars = await getAvatars(rows.map((row) => row.user_key));
  return rows.map((row) => ({ pseudo: row.pseudo, avatar: avatars.get(row.user_key) ?? null }));
}

export async function removeBookMemberAction(bookId: string, userKey: string) {
  await requireTeam(`/books/${bookId}`);
  await removeBookMember(bookId, userKey);
  revalidateBooks(bookId);
}

/**
 * Autorise (ou non) un membre à voir les stratégies des autres membres du book.
 * Réservé aux administrateurs : l'équipe non admin ne peut pas cocher la case.
 */
export async function setStrategyAccessAction(
  bookId: string,
  userKey: string,
  allowed: boolean,
): Promise<{ ok: boolean; message?: string }> {
  const viewer = await requireViewer(`/books/${bookId}`);
  if (!viewer.isAdmin) return { ok: false, message: "Réservé aux administrateurs." };
  if (typeof allowed !== "boolean" || typeof userKey !== "string") return { ok: false, message: "Requête invalide." };
  if (!(await setStrategyAccess(bookId, userKey, allowed))) return { ok: false, message: "Membre introuvable : recharge la page." };
  revalidateBooks(bookId);
  return { ok: true };
}

/* ---------- Contenu : la stratégie de chaque membre ---------- */

const MAX_STRATEGY_FILES = 10;

const strategySchema = z.object({
  title: z.string().trim().min(3, "3 caractères minimum.").max(140, "140 caractères maximum."),
  market: z.string().trim().max(60, "60 caractères maximum."),
  summary: z.string().trim().max(4000, "4 000 caractères maximum."),
  report: z.string().trim().max(20_000, "20 000 caractères maximum."),
  proposalId: z.string().trim(),
});

/**
 * Enregistre la stratégie d'un membre du book (`memberId` : « m0 », « m1 »…,
 * l'ordre des membres affiché). Le membre modifie la sienne ; un administrateur, toutes.
 */
export async function saveStrategyAction(
  bookId: string,
  memberId: string,
  _prev: BookFormState,
  form: FormData,
): Promise<BookFormState> {
  const viewer = await requireViewer(`/books/${bookId}`);
  const keys = await listBookMembers(bookId);
  const userKey = keys[Number(memberId.replace(/^m/, ""))];
  if (!userKey || !/^m\d+$/.test(memberId)) return { message: "Membre introuvable : recharge la page." };
  if (userKey !== viewer.id && !viewer.isAdmin) return { message: "Tu ne peux modifier que ta propre stratégie." };

  const values = {
    title: text(form, "title"),
    market: text(form, "market"),
    summary: text(form, "summary"),
    report: text(form, "report"),
    proposalId: text(form, "proposalId"),
  };
  const parsed = strategySchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: errorsOf(parsed.error), values };

  // la proposition liée doit appartenir au membre
  let proposalId: string | null = null;
  if (parsed.data.proposalId) {
    const own = await getProposalRepository().listByAuthor(userKey);
    if (!own.some((p) => p.id === parsed.data.proposalId)) {
      return { fieldErrors: { proposalId: "Proposition introuvable." }, values };
    }
    proposalId = parsed.data.proposalId;
  }

  const existing = await strategyFileIds(bookId, userKey);
  const remove = form.getAll("remove").map(String).filter((id) => existing.some((f) => f.id === id));
  const files = await readUploads(form, existing.length - remove.length, MAX_STRATEGY_FILES);
  if (typeof files === "string") return { fieldErrors: { files }, values };

  if (!(await consume(`book-strategy:${viewer.id}`, 60, 60 * 60))) {
    return { message: "Trop de modifications d'un coup. Réessaie dans une heure.", values };
  }

  await saveStrategy(bookId, userKey, { ...parsed.data, proposalId }, remove, files);
  revalidateBooks(bookId);
  return { ok: true, message: "Stratégie enregistrée." };
}
