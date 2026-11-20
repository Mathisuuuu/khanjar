import type { Metadata } from "next";
import { redirect } from "next/navigation";
import styles from "@/components/auth/AuthPanel.module.css";
import { PseudoForm } from "@/components/auth/PseudoForm";
import { Mascot } from "@/components/ui/Mascot";
import { safeCallbackUrl } from "@/lib/safe-redirect";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Choisis ton pseudo", robots: { index: false } };

type Props = { searchParams: Promise<{ callbackUrl?: string; changer?: string }> };

/** Nom du compte Discord, GitHub… transformé en proposition de pseudo valide. */
function suggestPseudo(name: string): string {
  const cleaned = name
    .normalize("NFKC")
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}_.-]/gu, "")
    .slice(0, 24);
  return cleaned.length >= 3 ? cleaned : "";
}

/**
 * Après une première connexion Discord, GitHub, Google ou Apple : la personne
 * choisit son pseudo. Aussi utilisée depuis /compte pour en changer (?changer=1).
 */
export default async function BienvenuePage({ searchParams }: Props) {
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl);
  const viewer = await getViewer();
  if (!viewer) redirect(`/connexion?callbackUrl=${encodeURIComponent(callbackUrl)}`);

  const changing = params.changer === "1";
  if (viewer.hasPseudo && !changing) redirect(callbackUrl);

  return (
    <div className="container" style={{ paddingTop: 56, paddingBottom: 96 }}>
      <div className={styles.card}>
        <div className={styles.top}>
          <Mascot width={34} />
          <h1>{changing ? "Change de pseudo" : "Bienvenue sur Griffin Lab"}</h1>
          <p>
            {changing
              ? "Ton nouveau pseudo s'affichera sur tes prochaines propositions et publications."
              : "Choisis le pseudo que les autres membres verront."}
          </p>
        </div>
        <PseudoForm
          callbackUrl={callbackUrl}
          suggestion={viewer.hasPseudo ? viewer.name : suggestPseudo(viewer.name)}
          submitLabel={changing ? "Enregistrer" : "Continuer"}
        />
      </div>
    </div>
  );
}
