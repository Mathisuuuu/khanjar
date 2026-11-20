"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  addBookMember,
  createBook,
  deleteBook,
  getBook,
  removeBookMember,
  updateBook,
} from "@/lib/books/repository";
import { getDb } from "@/lib/db";
import { consume } from "@/lib/rate-limit";
import { requireViewer } from "@/lib/viewer";

/**
 * Actions de gestion des books : réservées à l'équipe Griffin Lab (et aux
 * admins). L'interface masque ces formulaires aux autres, mais seule la
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
  if (!viewer.isTeam && !viewer.isAdmin) throw new Error("Réservé à l'équipe Griffin Lab.");
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
  monthReturn: decimal(-100, 1000),
});

export async function updateBookAction(bookId: string, _prev: BookFormState, form: FormData): Promise<BookFormState> {
  await requireTeam(`/books/${bookId}`);
  const values = {
    name: text(form, "name"),
    description: text(form, "description"),
    color: text(form, "color"),
    strategies: text(form, "strategies"),
    sharpe: text(form, "sharpe"),
    maxDrawdown: text(form, "maxDrawdown"),
    monthReturn: text(form, "monthReturn"),
  };
  const parsed = bookSchema.safeParse(values);
  const parsedStats = statsSchema.safeParse(values);
  if (!parsed.success || !parsedStats.success) {
    return {
      fieldErrors: { ...(parsed.success ? {} : errorsOf(parsed.error)), ...(parsedStats.success ? {} : errorsOf(parsedStats.error)) },
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
        monthReturn: Number(parsedStats.data.monthReturn),
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

export async function removeBookMemberAction(bookId: string, userKey: string) {
  await requireTeam(`/books/${bookId}`);
  await removeBookMember(bookId, userKey);
  revalidateBooks(bookId);
}
