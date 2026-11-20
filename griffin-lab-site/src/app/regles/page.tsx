import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusPill } from "@/components/proposals/StatusPill";
import { Button } from "@/components/ui/Button";
import { checks } from "@/content/home";
import styles from "@/components/layout/DocPage.module.css";

export const metadata: Metadata = {
  title: "Règles de contribution",
  description: "Comment proposer une stratégie, comment elle est évaluée et ce que tu obtiens.",
};

/** Ce que vérifie chaque contrôle, dans l'ordre de `checks`. */
const checkExplanations = [
  "Que l'effet tient sur plusieurs régimes de marché.",
  "Que la stratégie marche sur des données qu'elle n'a pas vues.",
  "Que la perte maximale reste maîtrisée.",
  "Que le résultat ne dépend pas de l'ordre des trades.",
  "La corrélation avec chaque book. La stratégie rejoint un book avec lequel elle est peu corrélée.",
];

const sections = [
  { id: "format", label: "Format d'envoi" },
  { id: "test", label: "Script de test" },
  { id: "statuts", label: "Statuts" },
  { id: "acces", label: "Accès 100 %" },
  { id: "propriete", label: "Propriété" },
  { id: "risques", label: "Risques" },
];

function Pending({ children = "À DÉFINIR" }: { children?: string }) {
  return <span className={styles.pending}>{children}</span>;
}

export default function RulesPage() {
  return (
    <>
      <PageHeader crumb="Règles" title="Règles de contribution">
        Comment proposer, comment ta stratégie est évaluée et ce que tu obtiens. Les points marqués « à définir » sont
        en cours de rédaction.
      </PageHeader>

      <div className={`container ${styles.layout}`}>
        <nav className={styles.toc} aria-label="Sommaire des règles">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`}>
              {s.label}
            </a>
          ))}
        </nav>

        <div>
          <article className={styles.rule} id="format">
            <p className={styles.number}>ARTICLE 1</p>
            <h2>Format d&apos;envoi</h2>
            <p>Trois formats sont acceptés, seuls ou combinés :</p>
            <ul>
              <li>
                <b>Une idée</b> : la règle décrite en quelques phrases, avec le marché, l&apos;unité de temps,
                l&apos;entrée, la sortie et le stop.
              </li>
              <li>
                <b>Un script</b> : le code de la stratégie (Python, Pine Script ou pseudo-code lisible).
              </li>
              <li>
                <b>Un papier SSRN</b> : le titre, les auteurs et le lien, avec l&apos;effet que tu veux tester. On cite
                le papier, on n&apos;en reproduit pas le contenu.
              </li>
            </ul>
          </article>

          <article className={styles.rule} id="test">
            <p className={styles.number}>ARTICLE 2</p>
            <h2>Le script de test</h2>
            <p>
              Toutes les propositions passent les mêmes cinq contrôles. Les quatre premiers décident si la stratégie
              est validée ; le dernier choisit le book qui l&apos;accueille. Elle reçoit ensuite un score sur 100.
            </p>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Contrôle</th>
                    <th>Seuil</th>
                    <th>Ce qu&apos;il vérifie</th>
                  </tr>
                </thead>
                <tbody>
                  {checks.map((check, i) => (
                    <tr key={check.name}>
                      <td>{check.name}</td>
                      <td className={styles.mono}>{check.threshold}</td>
                      <td>{checkExplanations[i]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3>Les books</h3>
            <p>
              Le bot est formé de plusieurs books reliés entre eux. Un book regroupe des stratégies peu
              corrélées les unes aux autres. Chaque stratégie validée qui rejoint un book améliore le bot entier.
            </p>
            <ul>
              <li>Si ta stratégie a une corrélation inférieure à 0,3 avec un book, elle s&apos;y connecte.</li>
              <li>
                Si elle est trop corrélée à un book (0,3 ou plus), elle n&apos;est pas rejetée pour autant : elle
                est dirigée vers un autre book.
              </li>
              <li>
                Si elle est trop corrélée à tous les books existants : création d&apos;un nouveau book ou mise
                en attente <Pending />
              </li>
            </ul>
            <p className={styles.small}>
              Seuils provisoires <Pending>À CONFIRMER</Pending>
            </p>
          </article>

          <article className={styles.rule} id="statuts">
            <p className={styles.number}>ARTICLE 3</p>
            <h2>Statuts d&apos;une proposition</h2>
            <ul className={styles.statusList}>
              <li>
                <StatusPill status="pending" /> reçue, en attente du test.
              </li>
              <li>
                <StatusPill status="testing" /> le script de test est en cours.
              </li>
              <li>
                <StatusPill status="validated" /> les contrôles sont réussis : la stratégie entre dans un book.
              </li>
              <li>
                <StatusPill status="rejected" /> au moins un contrôle échoue. La raison t&apos;est donnée (par exemple
                « drawdown de 18 % ») et tu peux renvoyer ta stratégie corrigée.
              </li>
            </ul>
          </article>

          <article className={styles.rule} id="acces">
            <p className={styles.number}>ARTICLE 4</p>
            <h2>L&apos;accès à 100 % du bot</h2>
            <p>
              L&apos;auteur d&apos;une stratégie validée obtient l&apos;accès complet au bot : toutes les stratégies,
              les signaux en temps réel, l&apos;exécution automatique et chaque amélioration future.
            </p>
            <p>
              Durée de l&apos;accès (à vie, liée à la performance ou renouvelable) <Pending />
            </p>
          </article>

          <article className={styles.rule} id="propriete">
            <p className={styles.number}>ARTICLE 5</p>
            <h2>Propriété des stratégies</h2>
            <p>
              Ce que devient une stratégie après son intégration sera écrit ici : qui la possède, si elle peut être
              retirée, et si son auteur peut la partager ailleurs. <Pending />
            </p>
          </article>

          <article className={styles.rule} id="risques">
            <p className={styles.number}>ARTICLE 6</p>
            <h2>Risques et cadre</h2>
            <ul>
              <li>
                Les résultats de backtest sont simulés. Les performances passées ou simulées ne préjugent pas des
                résultats futurs.
              </li>
              <li>Le trading comporte un risque de perte en capital. Rien sur ce site n&apos;est un conseil en investissement.</li>
              <li>
                Le cadre réglementaire des signaux et de l&apos;exécution automatique est en cours de vérification.{" "}
                <Pending>EN COURS</Pending>
              </li>
            </ul>
          </article>

          <Button href="/proposer">Proposer une stratégie</Button>
        </div>
      </div>
    </>
  );
}
