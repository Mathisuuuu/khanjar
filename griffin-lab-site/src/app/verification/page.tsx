import type { Metadata } from "next";
import Link from "next/link";
import { confirmEmail } from "@/app/connexion/actions";
import styles from "@/components/auth/AuthPanel.module.css";
import { Mascot } from "@/components/ui/Mascot";

export const metadata: Metadata = { title: "Confirmer mon adresse", robots: { index: false } };

type Props = { searchParams: Promise<{ token?: string; invalide?: string }> };

/**
 * Lien reçu par e-mail à l'inscription. La confirmation passe par un bouton
 * (et non par la simple ouverture du lien) : les antivirus de messagerie qui
 * visitent les liens ne consomment pas le jeton à la place de la personne.
 */
export default async function VerificationPage({ searchParams }: Props) {
  const { token, invalide } = await searchParams;
  const valid = !!token && !invalide;

  return (
    <div className="container" style={{ paddingTop: 56, paddingBottom: 96 }}>
      <div className={styles.card}>
        <div className={styles.top}>
          <Mascot width={34} />
          <h1>{valid ? "Confirme ton adresse" : "Lien invalide"}</h1>
          <p>
            {valid
              ? "Un clic et ton compte Griffin Lab est activé."
              : "Ce lien a expiré ou a déjà servi. Connecte-toi pour en recevoir un nouveau."}
          </p>
        </div>
        {valid ? (
          <form action={confirmEmail.bind(null, token)} className={styles.form}>
            <button type="submit" className={styles.submit}>
              Confirmer mon adresse
            </button>
          </form>
        ) : (
          <Link href="/connexion" className={styles.submit} style={{ textAlign: "center" }}>
            Aller à la connexion
          </Link>
        )}
      </div>
    </div>
  );
}
