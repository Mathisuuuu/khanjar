import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import styles from "@/components/layout/DocPage.module.css";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Qui nous sommes",
  description: "L'équipe derrière Griffin Lab, sa mission et sa façon de travailler.",
};

/**
 * Page « Qui nous sommes » : même mise en page que les Règles.
 * Le contenu est à rédiger : chaque article porte un repère « À RÉDIGER ».
 */
const sections = [
  { id: "mission", label: "Notre mission" },
  { id: "equipe", label: "L'équipe" },
  { id: "methode", label: "Notre méthode" },
  { id: "communaute", label: "La communauté" },
  { id: "contact", label: "Nous contacter" },
];

function ToWrite() {
  return <span className={styles.pending}>À RÉDIGER</span>;
}

export default function AboutPage() {
  return (
    <>
      <PageHeader crumb="Qui nous sommes" title="Qui nous sommes">
        L&apos;équipe derrière Griffin Lab, ce qui nous anime et comment nous travaillons. Cette page est en cours de
        rédaction.
      </PageHeader>

      <div className={`container ${styles.layout}`}>
        <nav className={styles.toc} aria-label="Sommaire">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`}>
              {s.label}
            </a>
          ))}
        </nav>

        <div>
          <article className={styles.rule} id="mission">
            <p className={styles.number}>01</p>
            <h2>Notre mission</h2>
            <p>
              Pourquoi Griffin Lab existe et ce que nous voulons construire avec la communauté. <ToWrite />
            </p>
          </article>

          <article className={styles.rule} id="equipe">
            <p className={styles.number}>02</p>
            <h2>L&apos;équipe</h2>
            <p>
              Les personnes qui développent le bot, le script de test et le site. <ToWrite />
            </p>
          </article>

          <article className={styles.rule} id="methode">
            <p className={styles.number}>03</p>
            <h2>Notre méthode</h2>
            <p>
              Comment nous testons les stratégies, comment nous construisons les boucles et comment nous publions nos
              recherches. <ToWrite />
            </p>
          </article>

          <article className={styles.rule} id="communaute">
            <p className={styles.number}>04</p>
            <h2>La communauté</h2>
            <p>
              Le rôle des contributeurs, le Discord et les groupes de recherche ouverts à tous. <ToWrite />
            </p>
          </article>

          <article className={styles.rule} id="contact">
            <p className={styles.number}>05</p>
            <h2>Nous contacter</h2>
            <p>
              Adresse de contact, réseaux et partenariats. <ToWrite />
            </p>
          </article>

          <Button href="/recherches">Voir nos recherches</Button>
        </div>
      </div>
    </>
  );
}
