import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { confirmEmail } from "@/app/connexion/actions";
import { CodeForm } from "@/components/auth/CodeForm";
import { signInSchema } from "@/lib/users/schema";
import { VERIFY_COOKIE } from "@/lib/users/verify-cookie";
import styles from "./verification.module.css";

export const metadata: Metadata = { title: "Vérifier mon adresse", robots: { index: false } };

type Props = { searchParams: Promise<{ token?: string; invalide?: string; attente?: string }> };

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
export default async function VerificationPage({ searchParams }: Props) {
  const { token, invalide, attente } = await searchParams;
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
            <h1>Dernière étape</h1>
            <p>Confirme ton adresse et ton compte Griffin Lab est activé.</p>
          </div>
          <form action={confirmEmail.bind(null, token)} className={styles.single}>
            <button type="submit" className={styles.primary}>
              Confirmer mon adresse
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
          <h1>{invalide ? "Lien expiré" : "Vérifie ta boîte mail"}</h1>
          <p>
            {invalide
              ? "Ce lien a expiré ou a déjà servi. Entre le code reçu par e-mail, ou demande-en un nouveau."
              : attente
                ? "Ton compte n'est pas encore activé. Entre le code à 6 chiffres reçu par e-mail."
                : "On t'a envoyé un code à 6 chiffres. Entre-le ci-dessous pour activer ton compte."}
          </p>
        </div>
        <CodeForm email={email} />
        <p className={styles.footer}>
          Déjà vérifié ? <Link href="/connexion">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
