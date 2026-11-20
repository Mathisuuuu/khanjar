"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthFormState, CodeFormState } from "@/app/connexion/actions";
import { canSendMail } from "@/lib/mail";
import { clientIp, consume } from "@/lib/rate-limit";
import { hashPassword } from "@/lib/users/password";
import { resetPasswordWithCode, resetPasswordWithLink, sendPasswordResetEmail } from "@/lib/users/password-reset";
import { getUserRepository } from "@/lib/users/repository";
import { signInSchema, signUpSchema } from "@/lib/users/schema";
import { RESET_COOKIE } from "@/lib/users/verify-cookie";

/**
 * Mot de passe oublié. La réponse est la même que le compte existe ou non :
 * on ne révèle pas quelles adresses ont un compte.
 */

const TOO_MANY = "Trop de tentatives. Réessaie dans quelques minutes.";

async function rememberResetEmail(email: string) {
  (await cookies()).set(RESET_COOKIE, email, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  });
}

/** Envoie le code (si un compte e-mail existe). Renvoie une erreur, ou `null` si c'est fait. */
async function sendReset(raw: FormDataEntryValue | null): Promise<{ email?: string; error?: string }> {
  const parsed = signInSchema.shape.email.safeParse(raw);
  if (!parsed.success) return { error: "Adresse e-mail invalide." };
  const email = parsed.data;
  if (!canSendMail()) return { email, error: "L'envoi d'e-mails n'est pas encore disponible." };

  const allowed =
    (await consume(`reset:ip:${await clientIp()}`, 10, 60 * 60)) && (await consume(`reset:email:${email}`, 3, 60 * 60));
  if (!allowed) return { email, error: TOO_MANY };

  const user = await getUserRepository().findByEmail(email);
  if (user) {
    try {
      await sendPasswordResetEmail(user);
    } catch (error) {
      console.error("E-mail de réinitialisation non envoyé :", error);
      return { email, error: "L'e-mail n'est pas parti. Réessaie plus tard." };
    }
  }
  await rememberResetEmail(email);
  return { email };
}

/** Étape 1 : l'adresse e-mail. */
export async function requestPasswordReset(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const { email, error } = await sendReset(formData.get("email"));
  if (error) return { values: { email }, error };
  redirect("/mot-de-passe-oublie");
}

/** « Renvoyer un code » depuis l'étape 2. */
export async function resendPasswordReset(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const { email, error } = await sendReset(formData.get("email"));
  if (error) return { values: { email }, error };
  return { values: { email }, notice: "Nouveau code envoyé." };
}

function checkNewPassword(formData: FormData): { hashable?: string; error?: string } {
  const password = String(formData.get("password") ?? "");
  const parsed = signUpSchema.shape.password.safeParse(password);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Mot de passe invalide." };
  if (password !== String(formData.get("confirm") ?? "")) return { error: "Les deux mots de passe ne sont pas identiques." };
  return { hashable: password };
}

async function done(): Promise<never> {
  (await cookies()).delete(RESET_COOKIE);
  redirect("/connexion?reinitialise=1");
}

/** Étape 2 : code reçu par e-mail + nouveau mot de passe. */
export async function resetPasswordWithCodeAction(_prev: CodeFormState, formData: FormData): Promise<CodeFormState> {
  const parsed = signInSchema.shape.email.safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Indique l'adresse e-mail de ton compte." };
  const email = parsed.data;
  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (code.length !== 6) return { error: "Le code contient 6 chiffres." };
  const { hashable, error } = checkNewPassword(formData);
  if (!hashable) return { error, keepCode: true };

  const allowed =
    (await consume(`reset-code:ip:${await clientIp()}`, 30, 60 * 60)) &&
    (await consume(`reset-code:email:${email}`, 10, 15 * 60));
  if (!allowed) return { error: TOO_MANY };

  const result = await resetPasswordWithCode(email, code, await hashPassword(hashable));
  if (result === "wrong") return { error: "Code incorrect. Vérifie les chiffres et réessaie." };
  if (result === "expired") return { expired: true, error: "Ce code a expiré ou a trop servi. Demande un nouveau code." };
  return done();
}

/** Variante : lien reçu par e-mail + nouveau mot de passe. */
export async function resetPasswordWithLinkAction(token: string, _prev: CodeFormState, formData: FormData): Promise<CodeFormState> {
  const { hashable, error } = checkNewPassword(formData);
  if (!hashable) return { error };
  if (!(await consume(`reset-link:ip:${await clientIp()}`, 30, 60 * 60))) return { error: TOO_MANY };
  const ok = await resetPasswordWithLink(token, await hashPassword(hashable));
  if (!ok) return { expired: true, error: "Ce lien a expiré ou a déjà servi. Demande un nouveau code." };
  return done();
}
