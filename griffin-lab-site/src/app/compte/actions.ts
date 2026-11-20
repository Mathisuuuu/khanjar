"use server";

import { revalidatePath } from "next/cache";
import { consume } from "@/lib/rate-limit";
import { PROFILE_VISIBILITIES, setVisibility, type ProfileVisibility } from "@/lib/users/identity";
import { requireViewer } from "@/lib/viewer";

export type VisibilityState = { ok?: boolean; message?: string };

/** Réglage d'anonymat : public, anonyme hors de ses books, ou anonyme pour tout le monde. */
export async function setVisibilityAction(_prev: VisibilityState, form: FormData): Promise<VisibilityState> {
  const viewer = await requireViewer("/compte");
  const value = String(form.get("visibility") ?? "") as ProfileVisibility;
  if (!PROFILE_VISIBILITIES.includes(value)) return { message: "Choix invalide." };
  if (!(await consume(`visibility:${viewer.id}`, 30, 60 * 60))) return { message: "Trop de changements. Réessaie plus tard." };
  await setVisibility(viewer.id, value);
  revalidatePath("/", "layout");
  return { ok: true, message: "Enregistré." };
}
