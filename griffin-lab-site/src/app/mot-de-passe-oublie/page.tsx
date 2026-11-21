import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { resendPasswordReset, resetPasswordWithCodeAction } from "@/app/mot-de-passe-oublie/actions";
import styles from "@/app/verification/verification.module.css";
import { CodeForm } from "@/components/auth/CodeForm";
import { PasswordFields, RequestResetForm, ResetLinkForm } from "@/components/auth/ResetForms";
import { isResetLinkValid } from "@/lib/users/password-reset";
import { signInSchema } from "@/lib/users/schema";
import { RESET_COOKIE } from "@/lib/users/verify-cookie";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Mot de passe oublié", "Forgot password"), robots: { index: false } };
}

type Props = { searchParams: Promise<{ token?: string; changer?: string }> };

function KeyIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="8" cy="15" r="4" />
      <path d="m10.8 12.2 8.7-8.7M16 7l2.5 2.5M18.5 4.5 21 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

async function Shell({ title, lead, children }: { title: string; lead: string; children: React.ReactNode }) {
  const t = await getT();
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.badge}>
          <KeyIcon />
        </div>
        <div className={styles.head}>
          <h1>{title}</h1>
          <p>{lead}</p>
        </div>
        {children}
        <p className={styles.footer}>
          {t("Tu t'en souviens ?", "Remember it?")} <Link href="/connexion">{t("Se connecter", "Sign in")}</Link>
        </p>
      </div>
    </div>
  );
}

/**
 * Mot de passe oublié, en deux étapes sur la même page :
 * 1. l'adresse du compte ; 2. le code reçu par e-mail et le nouveau mot de passe.
 * Le lien de l'e-mail (?token=…) mène directement au nouveau mot de passe.
 */
export default async function ForgotPasswordPage({ searchParams }: Props) {
  const { token, changer } = await searchParams;
  const t = await getT();

  if (token) {
    return (await isResetLinkValid(token)) ? (
      <Shell title={t("Nouveau mot de passe", "New password")} lead={t("Choisis ton nouveau mot de passe Griffin Lab.", "Choose your new Griffin Lab password.")}>
        <ResetLinkForm token={token} />
      </Shell>
    ) : (
      <Shell
        title={t("Lien expiré", "Link expired")}
        lead={t("Ce lien a expiré ou a déjà servi. Demande un nouveau code ci-dessous.", "This link has expired or has already been used. Request a new code below.")}
      >
        <RequestResetForm />
      </Shell>
    );
  }

  const pending = signInSchema.shape.email.safeParse((await cookies()).get(RESET_COOKIE)?.value);
  if (pending.success && !changer) {
    return (
      <Shell
        title={t("Vérifie ta boîte mail", "Check your inbox")}
        lead={t(
          "Si un compte existe pour cette adresse, un code à 6 chiffres vient d'y être envoyé. Entre-le avec ton nouveau mot de passe.",
          "If an account exists for this address, a 6-digit code has just been sent to it. Enter it with your new password.",
        )}
      >
        <CodeForm
          email={pending.data}
          action={resetPasswordWithCodeAction}
          resend={resendPasswordReset}
          submitLabel={t("Changer mon mot de passe", "Change my password")}
        >
          <PasswordFields />
        </CodeForm>
      </Shell>
    );
  }

  return (
    <Shell
      title={t("Mot de passe oublié", "Forgot password")}
      lead={t(
        "Indique l'adresse de ton compte : on t'envoie un code pour choisir un nouveau mot de passe.",
        "Enter your account's email address: we'll send you a code to choose a new password.",
      )}
    >
      <RequestResetForm email={pending.success ? pending.data : undefined} />
    </Shell>
  );
}
