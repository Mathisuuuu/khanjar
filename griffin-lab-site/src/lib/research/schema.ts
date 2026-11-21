import { z } from "zod";

/** Validation des formulaires de recherche (côté serveur, dans les actions). */

export const groupSchema = z.object({
  name: z.string().trim().min(3, "3 caractères minimum.").max(80, "80 caractères maximum."),
  description: z.string().trim().max(600, "600 caractères maximum.").default(""),
  visibility: z.enum(["public", "private"], { message: "Choisis public ou privé." }),
});

export const memberSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  role: z.enum(["editor", "viewer"], { message: "Rôle invalide." }),
});

export const postSchema = z.object({
  title: z.string().trim().min(3, "3 caractères minimum.").max(140, "140 caractères maximum."),
  category: z
    .string()
    .trim()
    .max(40, "40 caractères maximum.")
    .transform((v) => v || undefined),
  summary: z
    .string()
    .trim()
    .max(320, "320 caractères maximum.")
    .transform((v) => v || undefined),
  body: z.string().trim().min(1, "Écris quelques lignes.").max(20_000, "20 000 caractères maximum."),
  link: z
    .string()
    .trim()
    .max(500)
    .url("Lien invalide (il doit commencer par https://).")
    .refine((url) => /^https?:\/\//.test(url), "Lien invalide (il doit commencer par https://).")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type FieldErrors = Record<string, string>;

/** Premier message d'erreur par champ. */
export function firstErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}
