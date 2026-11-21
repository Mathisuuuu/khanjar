import { z } from "zod";

/** Validation des formulaires de compte (partagée client / serveur). */

const email = z.string().trim().toLowerCase().email("Adresse e-mail invalide.").max(200);

/** Pseudos qui pourraient faire croire à un compte officiel. */
const RESERVED = ["admin", "administrateur", "moderateur", "moderation", "griffin", "griffinlab", "support", "staff"];

export const pseudoSchema = z
  .string()
  .trim()
  .min(3, "3 caractères minimum.")
  .max(24, "24 caractères maximum.")
  .regex(/^[\p{L}\p{N}_.-]+$/u, "Lettres, chiffres, « _ », « . » et « - » uniquement (pas d'espace).")
  .refine(
    (value) => !RESERVED.includes(value.toLowerCase().replace(/[_.-]/g, "")),
    "Ce pseudo est réservé.",
  );

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Mot de passe requis.").max(200),
});

export const signUpSchema = z.object({
  name: pseudoSchema,
  email,
  password: z.string().min(8, "8 caractères minimum.").max(200, "200 caractères maximum."),
});
