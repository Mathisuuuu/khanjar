import type { Metadata } from "next";
import { redirect } from "next/navigation";
import styles from "@/components/auth/AuthPanel.module.css";
import { PseudoForm } from "@/components/auth/PseudoForm";
import { Mascot } from "@/components/ui/Mascot";
import { safeCallbackUrl } from "@/lib/safe-redirect";
import { getT } from "@/lib/i18n/server";
import { getViewer } from "@/lib/viewer";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Choisis ton pseudo", "Choose your username"), robots: { index: false } };
}

type Props = { searchParams: Promise<{ callbackUrl?: string; changer?: string }> };

/** Nom du compte Discord ou Google transformé en proposition de pseudo valide. */
function suggestPseudo(name: string): string {
  const cleaned = name
    .normalize("NFKC")
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}_.-]/gu, "")
    .slice(0, 24);
  return cleaned.length >= 3 ? cleaned : "";
}

/**
 * Après une première connexion Discord ou Google : la personne
 * choisit son pseudo. Aussi utilisée depuis /compte pour en changer (?changer=1).
 */
export default async function BienvenuePage({ searchParams }: Props) {
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl);
  const viewer = await getViewer();
  if (!viewer) redirect(`/connexion?callbackUrl=${encodeURIComponent(callbackUrl)}`);

  const changing = params.changer === "1";
  const t = await getT();
  if (viewer.hasPseudo && !changing) redirect(callbackUrl);

  return (
    <div className="container" style={{ paddingTop: 56, paddingBottom: 96 }}>
      <div className={styles.card}>
        <div className={styles.top}>
          <Mascot width={34} />
          <h1>{changing ? t("Change de pseudo", "Change your username") : t("Bienvenue sur Griffin Lab", "Welcome to Griffin Lab")}</h1>
          <p>
            {changing
              ? t(
                  "Ton nouveau pseudo s'affichera sur tes prochaines propositions et publications.",
                  "Your new username will appear on your next submissions and posts.",
                )
              : t("Choisis le pseudo que les autres membres verront.", "Choose the username other members will see.")}
          </p>
        </div>
        <PseudoForm
          callbackUrl={callbackUrl}
          suggestion={viewer.hasPseudo ? viewer.name : suggestPseudo(viewer.name)}
          submitLabel={changing ? t("Enregistrer", "Save") : t("Continuer", "Continue")}
        />
      </div>
    </div>
  );
}
