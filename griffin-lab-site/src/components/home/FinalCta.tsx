import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Mascot } from "@/components/ui/Mascot";
import styles from "./FinalCta.module.css";

export function FinalCta() {
  return (
    <section className={styles.final}>
      <div className={styles.glow} aria-hidden="true" />
      <div className="container">
        <Mascot width={84} className={styles.mascot} />
        <h2 className={styles.title}>
          Propose. Valide.
          <br />
          <span>Débloque le bot.</span>
        </h2>
        <p className={styles.lead}>
          Une idée, un script, un papier : tout le monde peut contribuer. Le test est le même pour tous.
        </p>
        <div className={styles.actions}>
          <Button href="/proposer">
            Proposer ma stratégie
            <Icon name="arrowRight" />
          </Button>
          <Button href="/a-propos#regles" variant="glass">
            Lire les règles
          </Button>
        </div>
      </div>
    </section>
  );
}
