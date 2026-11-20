import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Board } from "./Board";
import styles from "./Hero.module.css";

export function Hero() {
  return (
    <section className={styles.hero}>
      <div className={`container ${styles.copy}`}>
        <Link href="/regles" className={`glass ${styles.announce}`}>
          <span className={styles.new}>Nouveau</span>
          Les règles de contribution sont en ligne
          <Icon name="arrowRight" size={16} />
        </Link>
        <h1 className={styles.title}>Propose l&apos;idée. Débloque le bot.</h1>
        <p className={styles.lead}>
          Griffin Lab est un bot de trading construit par sa communauté. Ta stratégie passe le même test que toutes
          les autres ; si elle est validée, elle entre dans le bot et tu y accèdes à 100 %.
        </p>
        <div className={styles.actions}>
          <Button href="/proposer" size="lg">
            Proposer une stratégie
          </Button>
          <Button href="/books" variant="glass" size="lg">
            Voir les books
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
