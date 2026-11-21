import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import styles from "@/components/layout/DocPage.module.css";
import { StatusPill } from "@/components/proposals/StatusPill";
import { Button } from "@/components/ui/Button";
import { checks } from "@/content/home";
import { site } from "@/content/site";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Qui nous sommes et règles", "About us and rules"),
    description: t(
      "L'équipe derrière Griffin Lab, puis les règles de contribution : format, script de test, statuts et accès.",
      "The team behind Griffin Lab, then the contribution rules: format, test script, statuses and access.",
    ),
  };
}

/**
 * Page « À propos » : deux parties séparées sur la même page,
 * 1. Qui nous sommes (#about-us) ; 2. Règles de contribution (#rules).
 * Les anciennes adresses /qui-sommes-nous et /regles redirigent ici (next.config.ts).
 */

function Pending({ children }: { children: string }) {
  return <span className={styles.pending}>{children}</span>;
}

export default async function AboutPage() {
  const t = await getT();
  const tbd = t("À DÉFINIR", "TO BE DEFINED");

  const parts = [
    {
      id: "qui-sommes-nous",
      label: t("Qui nous sommes", "Who we are"),
      sections: [
        { id: "mission", label: t("Notre mission", "Our mission") },
        { id: "equipe", label: t("L'équipe", "The team") },
        { id: "methode", label: t("Notre méthode", "Our method") },
        { id: "communaute", label: t("La communauté", "The community") },
        { id: "contact", label: t("Nous rejoindre", "Join us") },
      ],
    },
    {
      id: "regles",
      label: t("Règles de contribution", "Contribution rules"),
      sections: [
        { id: "format", label: t("Format d'envoi", "Submission format") },
        { id: "test", label: t("Script de test", "Test script") },
        { id: "statuts", label: t("Statuts", "Statuses") },
        { id: "acces", label: t("Accès 100 %", "100% access") },
        { id: "propriete", label: t("Propriété", "Ownership") },
        { id: "risques", label: t("Risques", "Risks") },
      ],
    },
  ];

  return (
    <>
      <PageHeader crumb={t("À propos", "About")} title={t("Qui nous sommes et nos règles", "Who we are and our rules")} />

      <div className={`container ${styles.layout}`}>
        <nav className={styles.toc} aria-label={t("Sommaire", "Contents")}>
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
          <span id="about-us" className={styles.anchor} aria-hidden="true" />

          <article className={styles.rule} id="mission">
            <p className={styles.number}>01</p>
            <h2>{t("Notre mission", "Our mission")}</h2>
            <p>
              {t(
                "Après trois ans de trading, dont une année entière consacrée au trading algorithmique, nous savons à quel point il est difficile de trouver des stratégies qui restent viables sur le long terme. Seul, on teste peu d'idées et on se trompe souvent sans le savoir.",
                "After three years of trading, including a full year devoted to algorithmic trading, we know how hard it is to find strategies that stay viable over the long term. On your own, you test few ideas and are often wrong without knowing it.",
              )}
            </p>
            <p>
              {t(
                <>
                  Griffin Lab est notre réponse : un projet collaboratif où chacun propose ses idées, où toutes passent
                  le même test rigoureux, et où les meilleures rejoignent un bot commun. <b>Tout est gratuit.</b> Nous
                  pensons que l&apos;entraide et le partage sont la clé de la réussite de chacun.
                </>,
                <>
                  Griffin Lab is our answer: a collaborative project where everyone submits their ideas, all of them go
                  through the same rigorous test, and the best ones join a shared bot. <b>Everything is free.</b> We
                  believe that helping each other and sharing are the key to everyone&apos;s success.
                </>,
              )}
            </p>
          </article>

          <article className={styles.rule} id="equipe">
            <p className={styles.number}>02</p>
            <h2>{t("L'équipe", "The team")}</h2>
            <p>
              {t(
                <>
                  Nous sommes des étudiants en 4<sup>e</sup> et 5<sup>e</sup> année dans des universités françaises,
                  en finance et en informatique. Les uns apportent la compréhension des marchés et de la gestion du
                  risque, les autres le code, les données et les outils.
                </>,
                <>
                  We are 4th- and 5th-year students at French universities, in finance and computer science. Some bring
                  an understanding of markets and risk management, others the code, the data and the tools.
                </>,
              )}
            </p>
            <p>
              {t(
                "Le projet a demandé plus de six mois de préparation avant son lancement : le script de test, nos applications de backtest et ce site.",
                "The project took more than six months of preparation before launch: the test script, our backtesting applications and this site.",
              )}
            </p>
          </article>

          <article className={styles.rule} id="methode">
            <p className={styles.number}>03</p>
            <h2>{t("Notre méthode", "Our method")}</h2>
            <p>
              {t(
                "Un travail rigoureux, avec des applications de backtest que nous avons créées nous-mêmes. Chaque stratégie est jugée sur des faits, jamais sur une intuition :",
                "Rigorous work, with backtesting applications we built ourselves. Every strategy is judged on facts, never on a hunch:",
              )}
            </p>
            <ul>
              <li>{t("un backtest sur 15 ans, sur plusieurs régimes de marché ;", "a 15-year backtest, across several market regimes;")}</li>
              <li>
                {t(
                  "un test hors échantillon sur 5 ans, sur des données que la stratégie n'a jamais vues ;",
                  "a 5-year out-of-sample test, on data the strategy has never seen;",
                )}
              </li>
              <li>
                {t(
                  "un contrôle anti-surapprentissage et un calcul d'IC (coefficient de corrélation entre le signal et les rendements futurs) ;",
                  "an anti-overfitting check and an IC calculation (correlation between the signal and future returns);",
                )}
              </li>
              <li>
                {t(
                  "un contrôle du risque (drawdown maximal inférieur au rendement annuel) et un stress statistique (Monte Carlo) ;",
                  "a risk check (maximum drawdown below the annual return) and a statistical stress test (Monte Carlo);",
                )}
              </li>
              <li>
                {t(
                  "une mesure de corrélation, pour qu'elle rejoigne le book où elle apporte vraiment quelque chose.",
                  "a correlation measure, so it joins the book where it really adds something.",
                )}
              </li>
            </ul>
            <p>
              {t(
                <>
                  Le détail des contrôles et des seuils est dans la <a href="#test">partie Règles</a>.
                </>,
                <>
                  The checks and thresholds are detailed in the <a href="#test">Rules section</a>.
                </>,
              )}
            </p>
          </article>

          <article className={styles.rule} id="communaute">
            <p className={styles.number}>04</p>
            <h2>{t("La communauté", "The community")}</h2>
            <p>
              {t(
                "Griffin Lab se construit avec celles et ceux qui y participent. Tu peux proposer une idée, un script ou un papier de recherche, publier dans les groupes de recherche, ou simplement discuter des stratégies des autres. Une contribution validée te donne accès au bot entier, gratuitement.",
                "Griffin Lab is built with the people who take part. You can submit an idea, a script or a research paper, post in the research groups, or simply discuss other people's strategies. A validated contribution gives you access to the whole bot, for free.",
              )}
            </p>
          </article>

          <article className={styles.rule} id="contact">
            <p className={styles.number}>05</p>
            <h2>{t("Nous rejoindre", "Join us")}</h2>
            <p>
              {t(
                <>
                  Tout se passe sur notre serveur Discord : les échanges, l&apos;entraide, les annonces et le suivi des
                  stratégies. <b>Pour nous rejoindre, rejoins le serveur.</b>
                </>,
                <>
                  Everything happens on our Discord server: discussions, mutual help, announcements and strategy
                  tracking. <b>To join us, join the server.</b>
                </>,
              )}
            </p>
            <div className={styles.joinActions}>
              <Button href={site.discordUrl} target="_blank" rel="noopener noreferrer">
                {t("Rejoindre le Discord", "Join the Discord")}
              </Button>
              <Button href="/research" variant="glass">
                {t("Voir nos recherches", "See our research")}
              </Button>
            </div>
          </article>

          <span id="rules" className={styles.anchor} aria-hidden="true" />

          <article className={styles.rule} id="format">
            <p className={styles.number}>ARTICLE 1</p>
            <h2>{t("Format d'envoi", "Submission format")}</h2>
            <p>{t("Trois formats sont acceptés, seuls ou combinés :", "Three formats are accepted, alone or combined:")}</p>
            <ul>
              <li>
                {t(
                  <>
                    <b>Une idée</b> : la règle décrite en quelques phrases, avec le marché, l&apos;unité de temps,
                    l&apos;entrée, la sortie et le stop.
                  </>,
                  <>
                    <b>An idea</b>: the rule described in a few sentences, with the market, the timeframe, the entry,
                    the exit and the stop.
                  </>,
                )}
              </li>
              <li>
                {t(
                  <>
                    <b>Un script</b> : le code de la stratégie (Python, Pine Script ou pseudo-code lisible).
                  </>,
                  <>
                    <b>A script</b>: the strategy code (Python, Pine Script or readable pseudo-code).
                  </>,
                )}
              </li>
              <li>
                {t(
                  <>
                    <b>Un papier SSRN</b> : le titre, les auteurs et le lien, avec l&apos;effet que tu veux tester. On
                    cite le papier, on n&apos;en reproduit pas le contenu.
                  </>,
                  <>
                    <b>An SSRN paper</b>: the title, the authors and the link, with the effect you want to test. We cite
                    the paper; we don&apos;t reproduce its content.
                  </>,
                )}
              </li>
            </ul>
          </article>

          <article className={styles.rule} id="test">
            <p className={styles.number}>ARTICLE 2</p>
            <h2>{t("Le script de test", "The test script")}</h2>
            <p>
              {t(
                "Toutes les propositions passent les mêmes sept contrôles. Les six premiers décident si la stratégie est validée ; le dernier choisit le book qui l'accueille. Elle reçoit ensuite un score sur 100.",
                "Every submission goes through the same seven checks. The first six decide whether the strategy is validated; the last one picks the book it joins. It then gets a score out of 100.",
              )}
            </p>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>{t("Contrôle", "Check")}</th>
                    <th>{t("Seuil", "Threshold")}</th>
                    <th>{t("Ce qu'il vérifie", "What it checks")}</th>
                  </tr>
                </thead>
                <tbody>
                  {checks(t).map((check) => (
                    <tr key={check.name}>
                      <td>{check.name}</td>
                      <td className={styles.mono}>{check.threshold}</td>
                      <td>{check.explanation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3>{t("Les books", "The books")}</h3>
            <p>
              {t(
                "Le bot est formé de plusieurs books reliés entre eux. Un book regroupe des stratégies peu corrélées les unes aux autres. Chaque stratégie validée qui rejoint un book améliore le bot entier.",
                "The bot is made of several linked books. A book groups strategies that are weakly correlated with each other. Every validated strategy that joins a book improves the whole bot.",
              )}
            </p>
            <ul>
              <li>
                {t(
                  "Si ta stratégie a une corrélation inférieure à 0,3 avec un book, elle s'y connecte.",
                  "If your strategy has a correlation below 0.3 with a book, it connects to it.",
                )}
              </li>
              <li>
                {t(
                  "Si elle est trop corrélée à un book (0,3 ou plus), elle n'est pas rejetée pour autant : elle est dirigée vers un autre book.",
                  "If it is too correlated with a book (0.3 or more), it is not rejected: it is sent to another book.",
                )}
              </li>
              <li>
                {t(
                  "Si elle est trop corrélée à tous les books existants : création d'un nouveau book ou mise en attente",
                  "If it is too correlated with every existing book: a new book is created or it is put on hold",
                )}{" "}
                <Pending>{tbd}</Pending>
              </li>
            </ul>
            <p className={styles.small}>
              {t("Seuils provisoires", "Provisional thresholds")} <Pending>{t("À CONFIRMER", "TO BE CONFIRMED")}</Pending>
            </p>
          </article>

          <article className={styles.rule} id="statuts">
            <p className={styles.number}>ARTICLE 3</p>
            <h2>{t("Statuts d'une proposition", "Submission statuses")}</h2>
            <ul className={styles.statusList}>
              <li>
                <StatusPill status="pending" /> {t("reçue, en attente du test.", "received, waiting for the test.")}
              </li>
              <li>
                <StatusPill status="testing" /> {t("le script de test est en cours.", "the test script is running.")}
              </li>
              <li>
                <StatusPill status="validated" />{" "}
                {t(
                  "les contrôles sont réussis : la stratégie entre dans un book.",
                  "the checks passed: the strategy joins a book.",
                )}
              </li>
              <li>
                <StatusPill status="rejected" />{" "}
                {t(
                  "au moins un contrôle échoue. La raison t'est donnée (par exemple « drawdown de 18 % ») et tu peux renvoyer ta stratégie corrigée.",
                  "at least one check fails. You are given the reason (for example “18% drawdown”) and you can resubmit your corrected strategy.",
                )}
              </li>
            </ul>
          </article>

          <article className={styles.rule} id="acces">
            <p className={styles.number}>ARTICLE 4</p>
            <h2>{t("L'accès à 100 % du bot", "Access to 100% of the bot")}</h2>
            <p>
              {t(
                "L'auteur d'une stratégie validée obtient l'accès complet au bot : toutes les stratégies, les signaux en temps réel, l'exécution automatique et chaque amélioration future.",
                "The author of a validated strategy gets full access to the bot: every strategy, real-time signals, automatic execution and every future improvement.",
              )}
            </p>
            <p>
              {t(
                "Durée de l'accès (à vie, liée à la performance ou renouvelable)",
                "Length of access (lifetime, tied to performance or renewable)",
              )}{" "}
              <Pending>{tbd}</Pending>
            </p>
          </article>

          <article className={styles.rule} id="propriete">
            <p className={styles.number}>ARTICLE 5</p>
            <h2>{t("Propriété des stratégies", "Strategy ownership")}</h2>
            <p>
              {t(
                "Ce que devient une stratégie après son intégration sera écrit ici : qui la possède, si elle peut être retirée, et si son auteur peut la partager ailleurs.",
                "What happens to a strategy after it is added will be written here: who owns it, whether it can be withdrawn, and whether its author can share it elsewhere.",
              )}{" "}
              <Pending>{tbd}</Pending>
            </p>
          </article>

          <article className={styles.rule} id="risques">
            <p className={styles.number}>ARTICLE 6</p>
            <h2>{t("Risques et cadre", "Risks and framework")}</h2>
            <ul>
              <li>
                {t(
                  "Les résultats de backtest sont simulés. Les performances passées ou simulées ne préjugent pas des résultats futurs.",
                  "Backtest results are simulated. Past or simulated performance does not guarantee future results.",
                )}
              </li>
              <li>
                {t(
                  "Le trading comporte un risque de perte en capital. Rien sur ce site n'est un conseil en investissement.",
                  "Trading involves a risk of capital loss. Nothing on this site is investment advice.",
                )}
              </li>
              <li>
                {t(
                  "Le cadre réglementaire des signaux et de l'exécution automatique est en cours de vérification.",
                  "The regulatory framework for signals and automatic execution is being reviewed.",
                )}{" "}
                <Pending>{t("EN COURS", "IN PROGRESS")}</Pending>
              </li>
            </ul>
          </article>

          <Button href="/submit">{t("Proposer une stratégie", "Submit a strategy")}</Button>
        </div>
      </div>
    </>
  );
}
