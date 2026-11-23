import { z } from "zod";
import { MARKETS, PROPOSAL_STATUSES, PROPOSAL_TYPES } from "./types";

/**
 * Règles de validation des propositions, utilisées par l'API (source de vérité)
 * et par le formulaire pour afficher les erreurs avant envoi.
 */

const trimmed = (max: number) => z.string().trim().max(max, `${max} caractères maximum.`);

export const newProposalSchema = z
  .object({
    type: z.enum(PROPOSAL_TYPES),
    pseudo: trimmed(32).optional().default(""),
    market: z.enum(MARKETS),
    title: trimmed(90).min(1, "Donne un titre à ta stratégie."),
    description: trimmed(2000).min(20, "Décris la règle en au moins 20 caractères."),
    code: trimmed(20000).optional().default(""),
    paperTitle: trimmed(200).optional().default(""),
    paperAuthors: trimmed(200).optional().default(""),
    paperUrl: z
      .string()
      .trim()
      .max(300)
      .optional()
      .default("")
      .refine((value) => value === "" || /^https?:\/\//i.test(value), "Le lien doit commencer par http(s)://."),
    acceptRules: z.literal(true, { error: "Accepte les règles de contribution." }),
  })
  .superRefine((data, ctx) => {
    if (data.type === "script" && !data.code) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["code"], message: "Colle le code de ta stratégie." });
    }
    if (data.type === "paper" && !data.paperTitle) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["paperTitle"], message: "Indique le titre du papier." });
    }
  });

export type NewProposalInput = z.input<typeof newProposalSchema>;
export type NewProposal = z.output<typeof newProposalSchema>;

export const moderationSchema = z.object({
  status: z.enum(PROPOSAL_STATUSES),
  score: z.number().int().min(0).max(100).optional(),
  reason: trimmed(300).optional(),
});

export type ModerationInput = z.infer<typeof moderationSchema>;

/** Transforme les erreurs zod en { champ: message } pour le formulaire. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    result[key] ??= issue.message;
  }
  return result;
}
