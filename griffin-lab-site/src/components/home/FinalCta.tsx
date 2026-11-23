import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Minitel } from "@/components/ui/Minitel";
import { getT } from "@/lib/i18n/server";
import styles from "./FinalCta.module.css";

export async function FinalCta() {
  const t = await getT();
  return (
    <section className={styles.final}>
      <div className={styles.glow} aria-hidden="true" />
      <div className="container">
        <div className={styles.avatar}>
          <Minitel width={96} auto />
        </div>
        <h2 className={styles.title}>
          {t("Propose. Valide.", "Submit. Validate.")}
          <br />
          <span>{t("Débloque un book.", "Unlock a book.")}</span>
        </h2>
        <p className={styles.lead}>
          {t(
            "Une idée, un script, un papier : tout le monde peut contribuer. Le test est le même pour tous.",
            "An idea, a script, a paper: anyone can contribute. The test is the same for everyone.",
          )}
        </p>
        <div className={styles.actions}>
          <Button href="/submit">
            {t("Proposer ma stratégie", "Submit my strategy")}
            <Icon name="arrowRight" />
          </Button>
          <Button href="/about#rules" variant="glass">
            {t("Lire les règles", "Read the rules")}
          </Button>
        </div>
      </div>
    </section>
  );
}
