"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { isProviderConfigured, type OAuthProviderId } from "@/lib/auth-providers";
import { canSendMail } from "@/lib/mail";
import { clientIp, consume } from "@/lib/rate-limit";
import { safeCallbackUrl } from "@/lib/safe-redirect";
import { hashPassword } from "@/lib/users/password";
import { getUserRepository } from "@/lib/users/repository";
import { signInSchema, signUpSchema } from "@/lib/users/schema";
import { confirmEmailToken, sendVerificationEmail } from "@/lib/users/verification";

/**
 * Actions serveur des pages /connexion, /verification et /compte.
 * En cas de succès, `signIn` redirige (il lève une redirection Next qu'il ne
 * faut pas intercepter) ; en cas d'échec, on renvoie un message au formulaire.
 */

export type AuthFormState = {
  error?: string;
  /** Message de réussite (ex. « vérifie ta boîte mail »). */
  notice?: string;
  /** Adresse à confirmer : le formulaire propose de renvoyer l'e-mail. */
  unverifiedEmail?: string;
  /** Valeurs renvoyées pour pré-remplir le formulaire après une erreur (jamais le mot de passe). */
  values?: { name?: string; email?: string };
  fieldErrors?: Partial<Record<"name" | "email" | "password", string>>;
};

const TOO_MANY = "Trop de tentatives. Réessaie dans quelques minutes.";

function firstErrors(issues: { path: (string | number)[]; message: string }[]): AuthFormState["fieldErrors"] {
  const errors: AuthFormState["fieldErrors"] = {};
  for (const issue of issues) {
    const key = issue.path[0] as keyof NonNullable<AuthFormState["fieldErrors"]>;
    errors[key] ??= issue.message;
  }
  return errors;
}

/** Connexion Discord, Google… : la première fois, la personne passe par /bienvenue pour choisir son pseudo. */
export async function signInWithProvider(provider: OAuthProviderId, callbackUrl: string) {
  if (!isProviderConfigured(provider)) return; // bouton désactivé côté interface
  const next = safeCallbackUrl(callbackUrl);
  await signIn(provider, { redirectTo: `/bienvenue?callbackUrl=${encodeURIComponent(next)}` });
}

export async function signInWithEmail(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = { email: String(formData.get("email") ?? "") };
  const parsed = signInSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { values, fieldErrors: firstErrors(parsed.error.issues) };

  try {
    await signIn("credentials", { ...parsed.data, redirectTo: safeCallbackUrl(formData.get("callbackUrl")) });
  } catch (error) {
    if (error instanceof CredentialsSignin && error.code === "rate_limited") return { values, error: TOO_MANY };
    if (error instanceof CredentialsSignin && error.code === "unverified") {
      return {
        values,
        unverifiedEmail: parsed.data.email,
        error: "Confirme d'abord ton adresse : clique sur le lien reçu par e-mail.",
      };
    }
    if (error instanceof AuthError && error.type === "AccessDenied") {
      return { values, error: "Ce compte a été suspendu par l'équipe Griffin Lab." };
    }
    if (error instanceof AuthError) return { values, error: "E-mail ou mot de passe incorrect." };
    throw error;
  }
  return {};
}

export async function signUpWithEmail(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = { name: String(formData.get("name") ?? ""), email: String(formData.get("email") ?? "") };
  const parsed = signUpSchema.safeParse({ ...values, password: formData.get("password") });
  if (!parsed.success) return { values, fieldErrors: firstErrors(parsed.error.issues) };

  const { name, email, password } = parsed.data;
  if (password.toLowerCase() === email) {
    return { values, fieldErrors: { password: "Choisis un mot de passe différent de ton e-mail." } };
  }
  if (!canSendMail()) {
    return { values, error: "Les inscriptions par e-mail ouvrent bientôt. En attendant, utilise Discord ou GitHub." };
  }
  if (!(await consume(`signup:ip:${await clientIp()}`, 5, 60 * 60))) return { values, error: TOO_MANY };

  const result = await getUserRepository().create({ name, email, passwordHash: await hashPassword(password) });
  if ("conflict" in result) {
    return result.conflict === "email"
      ? { values, fieldErrors: { email: "Un compte existe déjà avec cet e-mail." } }
      : { values, fieldErrors: { name: "Ce pseudo est déjà pris." } };
  }

  try {
    await sendVerificationEmail(result.user);
  } catch (error) {
    console.error("E-mail de vérification non envoyé :", error);
    return {
      values: { email },
      unverifiedEmail: email,
      error: "Compte créé, mais l'e-mail de confirmation n'est pas parti. Réessaie avec « Renvoyer l'e-mail ».",
    };
  }
  return {
    values: { email },
    notice: `Compte créé ! Clique sur le lien envoyé à ${email} pour l'activer, puis connecte-toi.`,
  };
}

/** Renvoie l'e-mail de confirmation. Réponse identique que le compte existe ou non. */
export async function resendVerification(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signInSchema.shape.email.safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Adresse e-mail invalide." };
  const email = parsed.data;

  const allowed =
    (await consume(`resend:ip:${await clientIp()}`, 10, 60 * 60)) && (await consume(`resend:email:${email}`, 3, 60 * 60));
  if (!allowed) return { values: { email }, error: TOO_MANY };

  const user = await getUserRepository().findByEmail(email);
  if (user && !user.emailVerifiedAt) {
    try {
      await sendVerificationEmail(user);
    } catch (error) {
      console.error("E-mail de vérification non envoyé :", error);
      return { values: { email }, unverifiedEmail: email, error: "L'e-mail n'est pas parti. Réessaie plus tard." };
    }
  }
  return { values: { email }, notice: `Si un compte en attente existe pour ${email}, un nouveau lien vient d'être envoyé.` };
}

/** Bouton « Confirmer mon adresse » de la page /verification. */
export async function confirmEmail(token: string) {
  const ok = await confirmEmailToken(token);
  redirect(ok ? "/connexion?verifie=1" : "/verification?invalide=1");
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
