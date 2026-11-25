"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n/core";

/**
 * Langue choisie dans les paramètres du compte : « fr » ou « en » (mémorisée un an),
 * ou « auto » pour revenir à la langue du navigateur.
 */
export async function setLocaleAction(choice: string) {
  const jar = await cookies();
  if (choice === "auto") jar.delete(LOCALE_COOKIE);
  else if (isLocale(choice)) {
    jar.set(LOCALE_COOKIE, choice, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  } else return;
  revalidatePath("/", "layout");
}
