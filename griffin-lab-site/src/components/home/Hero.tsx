import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Board } from "./Board";
import { getT } from "@/lib/i18n/server";
import styles from "./Hero.module.css";

export async function Hero() {
  const t = await getT();
  return (
    <section className={styles.hero}>
      <div className={`container ${styles.copy}`}>
        <Link href="/about#rules" className={`glass ${styles.announce}`}>
          <span className={styles.new}>{t("Nouveau", "New")}</span>
          {t("Les règles de contribution sont en ligne", "The contribution rules are live")}
          <Icon name="arrowRight" size={16} />
        </Link>
        <h1 className={styles.title}>{t("Propose l'idée. Débloque un book.", "Submit the idea. Unlock a book.")}</h1>
        <p className={styles.lead}>
          {t(
            "Fleija est un bot de trading construit par sa communauté. Ta stratégie passe le même test que toutes les autres ; si elle est validée, elle entre dans le book et tu améliores tes gains et baisses tes pertes gratuitement.",
            "Fleija is a trading bot built by its community. Your strategy goes through the same test as every other one; if it is validated, it joins the book and you increase your gains and reduce your losses for free.",
          )}
        </p>
        <div className={styles.actions}>
          <Button href="/submit" size="lg">
            {t("Proposer une stratégie", "Submit a strategy")}
          </Button>
          <Button href="/books" variant="glass" size="lg">
            {t("Voir les books", "See the books")}
          </Button>
        </div>
      </div>

      <div className={styles.stage}>
        <div className={`${styles.band} ${styles.bandLeft}`} aria-hidden="true" />
        <div className={`${styles.band} ${styles.bandRight}`} aria-hidden="true" />
        <div className="container">
          <Board />
        </div>
      </div>
    </section>
  );
}
