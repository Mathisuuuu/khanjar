import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import styles from "@/components/layout/DocPage.module.css";
import { StatusPill } from "@/components/proposals/StatusPill";
import { Button } from "@/components/ui/Button";
import { checks } from "@/content/home";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Qui nous sommes et règles",
  description: "L'équipe derrière Griffin Lab, puis les règles de contribution : format, script de test, statuts et accès.",
};

/**
 * Page « À propos » : deux parties séparées sur la même page,
 * 1. Qui nous sommes (#qui-sommes-nous) ; 2. Règles de contribution (#regles).
 * Les anciennes adresses /qui-sommes-nous et /regles redirigent ici (next.config.ts).
 */

/** Ce que vérifie chaque contrôle, dans l'ordre de `checks`. */
const checkExplanations = [
  "Que l'effet tient sur plusieurs régimes de marché.",
  "Que la stratégie marche sur des données qu'elle n'a pas vues.",
  "Que la perte maximale reste maîtrisée.",
  "Que le résultat ne dépend pas de l'ordre des trades.",
  "La corrélation avec chaque book. La stratégie rejoint un book avec lequel elle est peu corrélée.",
];

const parts = [
  {
    id: "qui-sommes-nous",
    label: "Qui nous sommes",
    sections: [
      { id: "mission", label: "Notre mission" },
      { id: "equipe", label: "L'équipe" },
      { id: "methode", label: "Notre méthode" },
      { id: "communaute", label: "La communauté" },
      { id: "contact", label: "Nous rejoindre" },
    ],
  },
  {
    id: "regles",
    label: "Règles de contribution",
    sections: [
      { id: "format", label: "Format d'envoi" },
      { id: "test", label: "Script de test" },
      { id: "statuts", label: "Statuts" },
      { id: "acces", label: "Accès 100 %" },
      { id: "propriete", label: "Propriété" },
      { id: "risques", label: "Risques" },
    ],
  },
];

/** Griffin Lab en bref, en tête de la partie 1. */
const facts = [
  { value: "4e – 5e année", label: "étudiants en finance et en informatique" },
  { value: "3 ans", label: "de trading, dont 1 an en algorithmique" },
  { value: "6 mois +", label: "de préparation avant le lancement" },
  { value: "100 % gratuit", label: "l'entraide et le partage avant tout" },
];

function Pending({ children = "À DÉFINIR" }: { children?: string }) {
  return <span className={styles.pending}>{children}</span>;
}

function PartHeader({ id, index, title, children }: { id: string; index: string; title: string; children: React.ReactNode }) {
  return (
    <header className={styles.part} id={id}>
      <p className={styles.partKicker}>PARTIE {index}</p>
      <h2>{title}</h2>
      <p>{children}</p>
    </header>
  );
}

export default function AboutPage() {
  return (
    <>
      <PageHeader crumb="À propos" title="Qui nous sommes et nos règles">
        D&apos;abord qui nous sommes et pourquoi nous avons lancé Griffin Lab, puis les règles de contribution. Les
        points marqués « à définir » sont en cours d&apos;écriture.
      </PageHeader>

      <div className={`container ${styles.layout}`}>
        <nav className={styles.toc} aria-label="Sommaire">
          {parts.map((part, index) => (
            <div key={part.id} className={styles.tocGroup}>
              <a href={`#${part.id}`} className={styles.tocTitle}>
                <span>{String(index + 1).padStart(2, "0")}</span> {part.label}
              </a>
              {part.sections.map((s) => (
                <a key={s.id} href={`#${s.id}`}>
                  {s.label}
                </a>
              ))}
            </div>
          ))}
        </nav>

        <div>
          <PartHeader id="qui-sommes-nous" index="1" title="Qui nous sommes">
            Des étudiants passionnés de trading algorithmique, et un projet ouvert à tous.
          </PartHeader>

          <ul className={styles.facts} aria-label="Griffin Lab en bref">
            {facts.map((fact) => (
              <li key={fact.label}>
                <b>{fact.value}</b>
                <span>{fact.label}</span>
              </li>
            ))}
          </ul>

          <article className={styles.rule} id="mission">
            <p className={styles.number}>01</p>
            <h2>Notre mission</h2>
            <p>
              Après trois ans de trading, dont une année entière consacrée au trading algorithmique, nous savons à quel
              point il est difficile de trouver des stratégies qui restent viables sur le long terme. Seul, on teste
              peu d&apos;idées et on se trompe souvent sans le savoir.
            </p>
            <p>
              Griffin Lab est notre réponse : un projet collaboratif où chacun propose ses idées, où toutes passent le
              même test rigoureux, et où les meilleures rejoignent un bot commun. <b>Tout est gratuit.</b> Nous
              pensons que l&apos;entraide et le partage sont la clé de la réussite de chacun.
            </p>
          </article>

          <article className={styles.rule} id="equipe">
            <p className={styles.number}>02</p>
            <h2>L&apos;équipe</h2>
            <p>
              Nous sommes des étudiants en 4<sup>e</sup> et 5<sup>e</sup> année dans des universités françaises, en
              finance et en informatique. Les uns apportent la compréhension des marchés et de la gestion du risque,
              les autres le code, les données et les outils.
            </p>
            <p>
              Le projet a demandé plus de six mois de préparation avant son lancement : le script de test, nos
              applications de backtest et ce site.
            </p>
          </article>

          <article className={styles.rule} id="methode">
            <p className={styles.number}>03</p>
            <h2>Notre méthode</h2>
            <p>
              Un travail rigoureux, avec des applications de backtest que nous avons créées nous-mêmes. Chaque
              stratégie est jugée sur des faits, jamais sur une intuition :
            </p>
            <ul>
              <li>un backtest long, sur plusieurs régimes de marché ;</li>
              <li>un test hors échantillon, sur des données que la stratégie n&apos;a jamais vues ;</li>
              <li>un contrôle du risque (drawdown maximal) et un stress statistique (Monte Carlo) ;</li>
              <li>une mesure de corrélation, pour qu&apos;elle rejoigne le book où elle apporte vraiment quelque chose.</li>
            </ul>
            <p>
              Le détail des contrôles et des seuils est dans la <a href="#test">partie Règles</a>.
            </p>
          </article>

          <article className={styles.rule} id="communaute">
            <p className={styles.number}>04</p>
            <h2>La communauté</h2>
            <p>
              Griffin Lab se construit avec celles et ceux qui y participent. Tu peux proposer une idée, un script ou
              un papier de recherche, publier dans les groupes de recherche, ou simplement discuter des stratégies des
              autres. Une contribution validée te donne accès au bot entier, gratuitement.
            </p>
          </article>

          <article className={styles.rule} id="contact">
            <p className={styles.number}>05</p>
            <h2>Nous rejoindre</h2>
            <p>
              Tout se passe sur notre serveur Discord : les échanges, l&apos;entraide, les annonces et le suivi des
              stratégies. <b>Pour nous rejoindre, rejoins le serveur.</b>
            </p>
            <div className={styles.joinActions}>
              <Button href={site.discordUrl} target="_blank" rel="noopener noreferrer">
                Rejoindre le Discord
              </Button>
              <Button href="/recherches" variant="glass">
                Voir nos recherches
              </Button>
            </div>
          </article>

          <PartHeader id="regles" index="2" title="Règles de contribution">
            Comment proposer, comment ta stratégie est évaluée et ce que tu obtiens.
          </PartHeader>

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
