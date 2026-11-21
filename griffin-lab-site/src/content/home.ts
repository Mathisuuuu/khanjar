/**
 * Contenu de la page d'accueil.
 * Tous les chiffres sont des EXEMPLES SIMULÉS : remplace-les par les vrais
 * résultats du bot avant de diffuser le site.
 */

export type LoopColor = "cyan" | "violet" | "amber";

export type Loop = {
  id: string; // lettre affichée dans le badge (A, B, C)
  name: string;
  strategies: number;
  sharpe: number;
  maxDrawdown: number; // en %, négatif
  monthReturn: number; // en %
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
    maxDrawdown: -8.1,
    monthReturn: 7.4,
    color: "cyan",
    series: { seed: 11, drift: 0.0011 },
  },
  {
    id: "B",
    name: "Book B",
    strategies: 5,
    sharpe: 1.41,
    maxDrawdown: -6.7,
    monthReturn: 5.1,
    color: "violet",
    series: { seed: 29, drift: 0.0008 },
  },
  {
    id: "C",
    name: "Book C",
    strategies: 3,
    sharpe: 1.22,
    maxDrawdown: -5.4,
    monthReturn: 3.8,
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

export const strategyStats: StrategyStat[] = [
  {
    status: "pending",
    label: "En attente",
    thisWeek: 6,
    factLabel: "Délai moyen avant test",
    factValue: "2 jours",
    total: 15,
  },
  {
    status: "validated",
    label: "Validées",
    thisWeek: 2,
    factLabel: "Score moyen",
    factValue: "83/100",
    total: 14,
  },
  {
    status: "rejected",
    label: "Refusées",
    thisWeek: 9,
    factLabel: "Motif le plus fréquent",
    factValue: "Drawdown > rendement annuel",
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

export const contributions: Contribution[] = [
  {
    key: "idea",
    lead: { highlight: "Une idée", after: "décrite en quelques phrases, sans une ligne de code." },
    text: "Pas besoin de savoir coder : la règle suffit.",
    snippet: [
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
  },
  {
    key: "script",
    lead: { before: "Ou un", highlight: "script", after: "déjà codé, prêt à être branché." },
    text: "Il passe directement dans le script de test.",
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
    lead: { before: "Ou encore un", highlight: "papier SSRN", after: "." },
    text: "Une recherche académique dont l'effet décrit peut être testé sur données réelles.",
    snippet: [
      [{ tone: "comment", text: "# papier → hypothèse testable" }],
      [{ tone: "keyword", text: "effet" }, { text: ": retour à la moyenne court terme" }],
      [{ tone: "keyword", text: "marché" }, { text: ": " }, { tone: "value", text: "futures sur indices" }],
    ],
  },
];

export type Check = {
  name: string;
  threshold: string;
};

/** Les sept contrôles du script de test (repris dans la page Règles). */
export const checks: Check[] = [
  { name: "Backtest", threshold: "15 ans · 2011–2025" },
  { name: "Hors échantillon", threshold: "5 ans · 2021–2025" },
  { name: "Anti-surapprentissage", threshold: "walk-forward · Sharpe déflaté" },
  { name: "IC (coefficient de corrélation)", threshold: "IC > 0,05" },
  { name: "Drawdown max", threshold: "< rendement annuel" },
  { name: "Monte Carlo", threshold: "1 000 tirages" },
  { name: "Placement dans un book", threshold: "ρ < 0,3" },
];

export type TerminalLine = {
  /** `command` est tapée caractère par caractère ; les autres lignes s'affichent d'un bloc. */
  kind: "command" | "output" | "success" | "result";
  text: string;
  /** Index du contrôle (dans `checks`) validé quand cette ligne s'affiche. */
  validates?: number;
};

/** Faux test joué en boucle dans le terminal de la section « Script de test ». */
export const terminalScript: TerminalLine[] = [
  { kind: "command", text: "griffin test strategy_rsi_ny.py" },
  { kind: "output", text: "→ chargement des données NQ 5 min · 2011–2025" },
  { kind: "output", text: "[1/7] backtest 15 ans ....... 2 716 trades" },
  { kind: "success", text: "      ✓ robustesse historique", validates: 0 },
  { kind: "output", text: "[2/7] hors échantillon 5 ans (2021–2025) ... PF 1,38" },
  { kind: "success", text: "      ✓ tient sur données jamais vues", validates: 1 },
  { kind: "output", text: "[3/7] anti-surapprentissage ... walk-forward 9/10 · DSR 0,97" },
  { kind: "success", text: "      ✓ pas de sur-optimisation", validates: 2 },
  { kind: "output", text: "[4/7] IC signal / rendement futur ... 0,08 (seuil 0,05)" },
  { kind: "success", text: "      ✓ le signal prédit vraiment", validates: 3 },
  { kind: "output", text: "[5/7] drawdown max 6,2 % < rendement annuel 14,8 %" },
  { kind: "success", text: "      ✓ perte maximale maîtrisée", validates: 4 },
  { kind: "output", text: "[6/7] monte carlo 1 000 tirages ... 94 % positifs" },
  { kind: "success", text: "      ✓ résultat indépendant de l'ordre des trades", validates: 5 },
  { kind: "output", text: "[7/7] corrélation : Book A 0,42 · Book B 0,12 · Book C 0,31" },
  { kind: "success", text: "      ✓ placée dans le Book B (ρ < 0,3)", validates: 6 },
  { kind: "result", text: "score 86/100 · VALIDÉE · le bot s'améliore" },
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

/** Ce que débloque une stratégie validée (section « La contrepartie »). */
export const perks = [
  { icon: "layers", title: "Tous les books", text: "Chaque stratégie de chaque book du bot." },
  { icon: "activity", title: "Signaux en temps réel", text: "Chaque entrée et sortie, au moment où elle se produit." },
  { icon: "zap", title: "Exécution automatique", text: "Le bot exécute pour toi, sans intervention." },
  { icon: "refresh", title: "Chaque amélioration", text: "Toutes les nouvelles stratégies et tous les nouveaux books du bot." },
] as const;
