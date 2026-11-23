/**
 * Contenu de la page d'accueil.
 * Tous les chiffres sont des EXEMPLES SIMULÉS : remplace-les par les vrais
 * résultats du bot avant de diffuser le site.
 */

import type { T } from "@/lib/i18n/core";

export type LoopColor = "cyan" | "violet" | "amber";

export type Loop = {
  id: string; // lettre affichée dans le badge (A, B, C)
  name: string;
  strategies: number;
  sharpe: number;
  maxDrawdown: number; // en %, négatif
  dayReturn: number; // en %, dernière journée complète
  allTime: number | null; // en %, depuis le lancement
  color: LoopColor;
  /** Paramètres de la courbe hebdomadaire de secours (si la base ne répond pas). */
  series: { seed: number; drift: number };
  /** Courbe des 7 derniers jours (rendement cumulé en %, un point par heure), venue de la simulation. */
  week?: number[];
  /** Rendement depuis 7 jours, en %. */
  weekReturn?: number;
};

export const loops: Loop[] = [
  {
    id: "A",
    name: "Book A",
    strategies: 6,
    sharpe: 1.84,
    maxDrawdown: -13,
    dayReturn: 0.9,
    allTime: 412.6,
    color: "cyan",
    series: { seed: 11, drift: 0.0011 },
  },
  {
    id: "B",
    name: "Book B",
    strategies: 5,
    sharpe: 1.41,
    maxDrawdown: -15.7,
    dayReturn: 1.2,
    allTime: 318.4,
    color: "violet",
    series: { seed: 29, drift: 0.0008 },
  },
  {
    id: "C",
    name: "Book C",
    strategies: 3,
    sharpe: 1.22,
    maxDrawdown: -21.1,
    dayReturn: -0.4,
    allTime: 187.9,
    color: "amber",
    series: { seed: 47, drift: 0.0006 },
  },
];

/** Seuil de corrélation au-dessous duquel une stratégie peut rejoindre un book. */
export const CORRELATION_LIMIT = 0.3;

/**
 * Exemple du schéma « Les books » : corrélation d'une nouvelle stratégie
 * avec chaque book. Elle rejoint le seul book sous le seuil.
 */
export const newStrategyExample = {
  name: "NQ Momentum",
  score: 86,
  correlation: { A: 0.42, B: 0.12, C: 0.58 } as Record<string, number>,
};

export type StrategyStat = {
  status: "pending" | "validated" | "rejected";
  label: string;
  thisWeek: number;
  factLabel: string;
  factValue: string;
  total: number;
};

export const strategyStats = (t: T): StrategyStat[] => [
  {
    status: "pending",
    label: t("En attente", "Pending"),
    thisWeek: 6,
    factLabel: t("Délai moyen avant test", "Average wait before testing"),
    factValue: t("2 jours", "2 days"),
    total: 15,
  },
  {
    status: "validated",
    label: t("Validées", "Validated"),
    thisWeek: 2,
    factLabel: t("Score moyen", "Average score"),
    factValue: "83/100",
    total: 14,
  },
  {
    status: "rejected",
    label: t("Refusées", "Rejected"),
    thisWeek: 9,
    factLabel: t("Motif le plus fréquent", "Most common reason"),
    factValue: t("Drawdown > rendement annuel", "Drawdown > annual return"),
    total: 56,
  },
];

export type Contribution = {
  key: "idea" | "script" | "paper";
  /** Phrase en gras : `highlight` est encadré par le pointeur animé. */
  lead: { before?: string; highlight: string; after?: string };
  text: string;
  snippet: { tone?: "comment" | "keyword" | "value"; text: string }[][];
};

export const contributions = (t: T): Contribution[] => [
  {
    key: "idea",
    lead: t(
      { highlight: "Une idée", after: "décrite en quelques phrases, sans une ligne de code." },
      { highlight: "An idea", after: "described in a few sentences, without a line of code." },
    ),
    text: t("Pas besoin de savoir coder : la règle suffit.", "No coding needed: the rule is enough."),
    snippet: t<Contribution["snippet"]>(
      [
        [{ tone: "comment", text: "# exemple" }],
        [
          { text: "Acheter " },
          { tone: "value", text: "NQ" },
          { text: " quand le " },
          { tone: "keyword", text: "RSI 5 min" },
          { text: " repasse au-dessus de " },
          { tone: "value", text: "30" },
          { text: " à l'ouverture de New York." },
        ],
      ],
      [
        [{ tone: "comment", text: "# example" }],
        [
          { text: "Buy " },
          { tone: "value", text: "NQ" },
          { text: " when the " },
          { tone: "keyword", text: "5-min RSI" },
          { text: " crosses back above " },
          { tone: "value", text: "30" },
          { text: " at the New York open." },
        ],
      ],
    ),
  },
  {
    key: "script",
    lead: t(
      { before: "Ou un", highlight: "script", after: "déjà codé, prêt à être branché." },
      { before: "Or a", highlight: "script", after: "already coded, ready to plug in." },
    ),
    text: t("Il passe directement dans le script de test.", "It goes straight into the test script."),
    snippet: [
      [{ tone: "keyword", text: "def" }, { text: " signal(bar):" }],
      [
        { text: "    " },
        { tone: "keyword", text: "if" },
        { text: " bar.rsi_5m > " },
        { tone: "value", text: "30" },
        { tone: "keyword", text: " and" },
        { text: " bar.ny_open:" },
      ],
      [{ text: "        " }, { tone: "keyword", text: "return" }, { tone: "value", text: ' "LONG"' }],
    ],
  },
  {
    key: "paper",
    lead: t(
      { before: "Ou encore un", highlight: "papier SSRN", after: "." },
      { before: "Or even an", highlight: "SSRN paper", after: "." },
    ),
    text: t(
      "Une recherche académique dont l'effet décrit peut être testé sur données réelles.",
      "Academic research whose effect can be tested on real data.",
    ),
    snippet: t<Contribution["snippet"]>(
      [
        [{ tone: "comment", text: "# papier → hypothèse testable" }],
        [{ tone: "keyword", text: "effet" }, { text: ": retour à la moyenne court terme" }],
        [{ tone: "keyword", text: "marché" }, { text: ": " }, { tone: "value", text: "futures sur indices" }],
      ],
      [
        [{ tone: "comment", text: "# paper → testable hypothesis" }],
        [{ tone: "keyword", text: "effect" }, { text: ": short-term mean reversion" }],
        [{ tone: "keyword", text: "market" }, { text: ": " }, { tone: "value", text: "index futures" }],
      ],
    ),
  },
];

export type Check = {
  name: string;
  threshold: string;
  /** Ce que vérifie le contrôle (tableau de la page Règles). */
  explanation: string;
};

/** Les sept contrôles du script de test (repris dans la page Règles). */
export const checks = (t: T): Check[] => [
  {
    name: "Backtest",
    threshold: t("15 ans · 2011–2025", "15 years · 2011–2025"),
    explanation: t("Que l'effet tient sur plusieurs régimes de marché.", "That the effect holds across several market regimes."),
  },
  {
    name: t("Hors échantillon", "Out of sample"),
    threshold: t("5 ans · 2021–2025", "5 years · 2021–2025"),
    explanation: t(
      "Que la stratégie marche sur des données qu'elle n'a pas vues.",
      "That the strategy works on data it has never seen.",
    ),
  },
  {
    name: t("Anti-surapprentissage", "Anti-overfitting"),
    threshold: t("walk-forward · Sharpe déflaté", "walk-forward · deflated Sharpe"),
    explanation: t(
      "Que les résultats ne viennent pas d'un réglage sur mesure du passé : validation glissante (walk-forward) et Sharpe corrigé du nombre d'essais.",
      "That the results don't come from tuning to the past: rolling validation (walk-forward) and a Sharpe ratio corrected for the number of trials.",
    ),
  },
  {
    name: t("IC (coefficient de corrélation)", "IC (information coefficient)"),
    threshold: t("IC > 0,05", "IC > 0.05"),
    explanation: t(
      "Que le signal prédit vraiment : corrélation entre le signal et les rendements qui suivent.",
      "That the signal really predicts: correlation between the signal and the returns that follow.",
    ),
  },
  {
    name: "Drawdown max",
    threshold: t("< rendement annuel", "< annual return"),
    explanation: t(
      "Que la pire perte depuis un plus haut reste inférieure au rendement de l'année.",
      "That the worst loss from a peak stays below the year's return.",
    ),
  },
  {
    name: "Monte Carlo",
    threshold: t("1 000 tirages", "1,000 runs"),
    explanation: t("Que le résultat ne dépend pas de l'ordre des trades.", "That the result doesn't depend on the order of trades."),
  },
  {
    name: t("Placement dans un book", "Book placement"),
    threshold: t("ρ < 0,3", "ρ < 0.3"),
    explanation: t(
      "La corrélation avec chaque book. La stratégie rejoint un book avec lequel elle est peu corrélée.",
      "Correlation with each book. The strategy joins a book it is weakly correlated with.",
    ),
  },
];

export type TerminalLine = {
  /** `command` est tapée caractère par caractère ; les autres lignes s'affichent d'un bloc. */
  kind: "command" | "output" | "success" | "result";
  text: string;
  /** Index du contrôle (dans `checks`) validé quand cette ligne s'affiche. */
  validates?: number;
};

/** Faux test joué en boucle dans le terminal de la section « Script de test ». */
export const terminalScript = (t: T): TerminalLine[] => [
  { kind: "command", text: "fleija test strategy_rsi_ny.py" },
  { kind: "output", text: t("→ chargement des données NQ 5 min · 2011–2025", "→ loading NQ 5-min data · 2011–2025") },
  { kind: "output", text: t("[1/7] backtest 15 ans ....... 2 716 trades", "[1/7] backtest 15 years ..... 2,716 trades") },
  { kind: "success", text: t("      ✓ robustesse historique", "      ✓ historical robustness"), validates: 0 },
  {
    kind: "output",
    text: t("[2/7] hors échantillon 5 ans (2021–2025) ... PF 1,38", "[2/7] out of sample 5 years (2021–2025) ... PF 1.38"),
  },
  { kind: "success", text: t("      ✓ tient sur données jamais vues", "      ✓ holds on unseen data"), validates: 1 },
  {
    kind: "output",
    text: t("[3/7] anti-surapprentissage ... walk-forward 9/10 · DSR 0,97", "[3/7] anti-overfitting ... walk-forward 9/10 · DSR 0.97"),
  },
  { kind: "success", text: t("      ✓ pas de sur-optimisation", "      ✓ no over-optimisation"), validates: 2 },
  {
    kind: "output",
    text: t("[4/7] IC signal / rendement futur ... 0,08 (seuil 0,05)", "[4/7] IC signal / future return ... 0.08 (threshold 0.05)"),
  },
  { kind: "success", text: t("      ✓ le signal prédit vraiment", "      ✓ the signal really predicts"), validates: 3 },
  {
    kind: "output",
    text: t("[5/7] drawdown max 6,2 % < rendement annuel 14,8 %", "[5/7] max drawdown 6.2% < annual return 14.8%"),
  },
  { kind: "success", text: t("      ✓ perte maximale maîtrisée", "      ✓ maximum loss under control"), validates: 4 },
  {
    kind: "output",
    text: t("[6/7] monte carlo 1 000 tirages ... 94 % positifs", "[6/7] monte carlo 1,000 runs ... 94% positive"),
  },
  {
    kind: "success",
    text: t("      ✓ résultat indépendant de l'ordre des trades", "      ✓ result independent of trade order"),
    validates: 5,
  },
  {
    kind: "output",
    text: t("[7/7] corrélation : Book A 0,42 · Book B 0,12 · Book C 0,31", "[7/7] correlation: Book A 0.42 · Book B 0.12 · Book C 0.31"),
  },
  { kind: "success", text: t("      ✓ placée dans le Book B (ρ < 0,3)", "      ✓ placed in Book B (ρ < 0.3)"), validates: 6 },
  { kind: "result", text: t("score 86/100 · VALIDÉE · le bot s'améliore", "score 86/100 · VALIDATED · the bot improves") },
];

/**
 * Progression du bot à chaque stratégie ajoutée (simulée).
 * Sert à montrer que chaque ajout améliore le bot, sans numéro de version.
 */
export const improvementSteps: { strategies: number; sharpe: number; maxDrawdown: number }[] = [
  { strategies: 5, sharpe: 1.18, maxDrawdown: -12.4 },
  { strategies: 7, sharpe: 1.27, maxDrawdown: -11.6 },
  { strategies: 9, sharpe: 1.36, maxDrawdown: -10.9 },
  { strategies: 11, sharpe: 1.48, maxDrawdown: -10.1 },
  { strategies: 13, sharpe: 1.57, maxDrawdown: -9.4 },
  { strategies: 14, sharpe: 1.66, maxDrawdown: -8.8 },
  { strategies: 16, sharpe: 1.84, maxDrawdown: -8.1 },
];
