"use server";

import { redirect } from "next/navigation";
import { consume } from "@/lib/rate-limit";
import { safeCallbackUrl } from "@/lib/safe-redirect";
import { setPseudo } from "@/lib/users/profiles";
import { pseudoSchema } from "@/lib/users/schema";
import { getViewer } from "@/lib/viewer";

export type PseudoFormState = { error?: string; value?: string };

/** Choix (ou changement) du pseudo, puis retour à la page demandée. */
export async function choosePseudo(callbackUrl: string, _prev: PseudoFormState, form: FormData): Promise<PseudoFormState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/connexion");

  const value = String(form.get("pseudo") ?? "");
  const parsed = pseudoSchema.safeParse(value);
  if (!parsed.success) return { value, error: parsed.error.issues[0]?.message ?? "Pseudo invalide." };
  if (!(await consume(`pseudo:${viewer.id}`, 10, 60 * 60))) {
    return { value, error: "Trop de changements. Réessaie dans une heure." };
  }
  if (!(await setPseudo(viewer.id, parsed.data))) return { value, error: "Ce pseudo est déjà pris." };

  redirect(safeCallbackUrl(callbackUrl));
}
