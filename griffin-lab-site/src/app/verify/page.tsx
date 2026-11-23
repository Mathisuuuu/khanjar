import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { confirmEmail, resendVerification, verifyCode } from "@/app/sign-in/actions";
import { CodeForm } from "@/components/auth/CodeForm";
import { signInSchema } from "@/lib/users/schema";
import { VERIFY_COOKIE } from "@/lib/users/verify-cookie";
import { getT } from "@/lib/i18n/server";
import styles from "./verify.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Vérifier mon adresse", "Verify my email"), robots: { index: false } };
}

type Props = { searchParams: Promise<{ token?: string; invalid?: string; pending?: string }> };

function MailIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m4 7 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Vérification de l'adresse : saisie du code à 6 chiffres, ou lien reçu
 * par e-mail. Le lien passe par un bouton (et non par la simple ouverture) :
 * les antivirus de messagerie qui visitent les liens ne le consomment pas.
 */
export default async function VerifyPage({ searchParams }: Props) {
  const { token, invalid: invalide, pending: attente } = await searchParams;
  const t = await getT();
  const pending = signInSchema.shape.email.safeParse((await cookies()).get(VERIFY_COOKIE)?.value);
  const email = pending.success ? pending.data : undefined;

  if (token && !invalide) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={`${styles.badge} ${styles.badgeOk}`}>
            <CheckIcon />
          </div>
          <div className={styles.head}>
            <h1>{t("Dernière étape", "Last step")}</h1>
            <p>{t("Confirme ton adresse et ton compte Fleija est activé.", "Confirm your email and your Fleija account is activated.")}</p>
          </div>
          <form action={confirmEmail.bind(null, token)} className={styles.single}>
            <button type="submit" className={styles.primary}>
              {t("Confirmer mon adresse", "Confirm my email")}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.badge}>
          <MailIcon />
        </div>
        <div className={styles.head}>
          <h1>{invalide ? t("Lien expiré", "Link expired") : t("Vérifie ta boîte mail", "Check your inbox")}</h1>
          <p>
            {invalide
              ? t(
                  "Ce lien a expiré ou a déjà servi. Entre le code reçu par e-mail, ou demande-en un nouveau.",
                  "This link has expired or has already been used. Enter the code you received by email, or request a new one.",
                )
              : attente
                ? t(
                    "Ton compte n'est pas encore activé. Entre le code à 6 chiffres reçu par e-mail.",
                    "Your account isn't activated yet. Enter the 6-digit code you received by email.",
                  )
                : t(
                    "On t'a envoyé un code à 6 chiffres. Entre-le ci-dessous pour activer ton compte.",
                    "We sent you a 6-digit code. Enter it below to activate your account.",
                  )}
          </p>
        </div>
        <CodeForm email={email} action={verifyCode} resend={resendVerification} />
        <p className={styles.footer}>
          {t("Déjà vérifié ?", "Already verified?")} <Link href="/sign-in">{t("Se connecter", "Sign in")}</Link>
        </p>
      </div>
    </div>
  );
}
