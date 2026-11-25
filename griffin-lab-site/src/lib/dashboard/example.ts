import { makeT, type Locale } from "@/lib/i18n/core";
import type { DashboardBook, DashDay } from "@/components/dashboard/types";
import { backtestDay } from "@/lib/books/backtest";
import { seeded, summarize } from "./metrics";

/**
 * Book d'exemple de /dashboards, pour les personnes qui ne sont dans aucun book :
 * stratégies, membres et rendements fictifs, toujours les mêmes (tirage à graine
 * fixe depuis le 1er novembre 2025), avec un nouveau jour chaque jour.
 */

export const EXAMPLE_ID = "example";
const COLOR = "#38bdf8";
const DAY = 86_400_000;
/** 10 ans de backtest, puis la simulation « en direct » depuis le 1er septembre 2026. */
const LIVE_START = Date.UTC(2026, 8, 1);
const BACKTEST_DAYS = 3650;
/** Même modèle que les vrais books (6 stratégies) : 60 % de journées positives. */
const DAILY_VOL = 0.016;
const DRIFT = 0.2533471031357997 * DAILY_VOL;

function exampleDays(now: number): DashDay[] {
  // graine fixe : le même historique à chaque affichage, un nouveau jour chaque jour
  const random = seeded(6);
  const gaussian = () => {
    let u = 0;
    while (u === 0) u = random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
  };
  const today = Math.floor(now / DAY) * DAY;
  const days: DashDay[] = [];
  for (let at = LIVE_START - BACKTEST_DAYS * DAY; at < LIVE_START; at += DAY) {
    days.push({ date: new Date(at).toISOString().slice(0, 10), value: backtestDay(6, random), backtest: true });
  }
  for (let at = LIVE_START; at <= today; at += DAY) {
    const z = gaussian();
    const date = new Date(at).toISOString().slice(0, 10);
    if (at < today) {
      days.push({ date, value: (Math.exp(DRIFT + DAILY_VOL * z) - 1) * 100 });
    } else {
      // journée en cours : la part écoulée de la journée
      const share = Math.max(1 / 24, (now - today) / DAY);
      days.push({ date, value: (Math.exp(DRIFT * share + DAILY_VOL * Math.sqrt(share) * z) - 1) * 100, partial: true });
    }
  }
  return days;
}

export function exampleBook(locale: Locale, now = Date.now()): DashboardBook {
  const t = makeT(locale);
  const days = exampleDays(now);
  const complete = days.filter((d) => !d.partial);
  const compound = (list: DashDay[]) => (list.reduce((acc, d) => acc * (1 + d.value / 100), 1) - 1) * 100;
  const summary = summarize(complete.map((d) => d.value));

  const people = [
    { name: "Nadia", anonymous: false },
    { name: "quant_ella", anonymous: false },
    { name: "Kenji", anonymous: false },
    { name: "Lucas M.", anonymous: false },
    { name: "trader_owl", anonymous: false },
    { name: "Samir", anonymous: false },
    { name: t("Anonyme", "Anonymous"), anonymous: true },
  ];
  const members = people.map((p, i) => ({
    id: `m${i}`,
    name: p.name,
    href: null,
    anonymous: p.anonymous,
    masked: false,
    self: false,
    avatar: null,
  }));

  const strategies = [
    {
      title: t("Momentum d'ouverture sur le Nasdaq", "Nasdaq opening momentum"),
      market: "NQ (Nasdaq 100)",
      summary: t(
        "Suit la direction des 30 premières minutes quand le volume dépasse sa moyenne sur 20 jours.",
        "Follows the direction of the first 30 minutes when volume beats its 20-day average.",
      ),
      score: 82,
    },
    {
      title: t("Retour à la moyenne sur l'EUR/USD", "EUR/USD mean reversion"),
      market: "EUR/USD",
      summary: t(
        "Joue le retour vers la moyenne après un écart de plus de deux écarts types, en séance européenne.",
        "Trades the return to the mean after a move of more than two standard deviations, during the European session.",
      ),
      score: 74,
    },
    {
      title: t("Taux de financement des contrats perpétuels BTC", "BTC perpetual funding rate"),
      market: "BTC",
      summary: t(
        "Se place contre la foule quand le taux de financement atteint un extrême.",
        "Takes the other side of the crowd when the funding rate hits an extreme.",
      ),
      score: 69,
    },
    {
      title: t("Saisonnalité du pétrole autour des stocks EIA", "Crude oil around EIA inventories"),
      market: "CL (pétrole)",
      summary: t(
        "Exploite la réaction du pétrole à la publication hebdomadaire des stocks américains.",
        "Uses the crude oil reaction to the weekly US inventory report.",
      ),
      score: 71,
    },
    {
      title: t("Or contre dollar en période de stress", "Gold versus the dollar under stress"),
      market: "GC (or)",
      summary: t(
        "Achète l'or quand la volatilité des actions s'envole et que le dollar faiblit.",
        "Buys gold when equity volatility spikes and the dollar weakens.",
      ),
      score: 66,
    },
    {
      title: t("Paires d'actions US cointégrées", "Cointegrated US stock pairs"),
      market: "Actions US",
      summary: t(
        "Arbitrage statistique sur des paires du même secteur, d'après un papier SSRN.",
        "Statistical arbitrage on same-sector pairs, based on an SSRN paper.",
      ),
      score: 78,
    },
  ].map((s, i) => ({
    memberId: `m${i}`,
    author: people[i].name,
    authorHref: null,
    self: false,
    deposited: true,
    status: "validated" as const,
    ...s,
  }));

  return {
    id: EXAMPLE_ID,
    name: t("Book d'exemple", "Example book"),
    color: COLOR,
    description: t(
      "Un book fictif pour découvrir le dashboard : rendements, stratégies et membres inventés.",
      "A made-up book to explore the dashboard: invented returns, strategies and members.",
    ),
    example: true,
    stats: {
      strategies: strategies.length,
      sharpe: summary.sharpe,
      maxDrawdown: summary.maxDrawdown,
      dayReturn: complete[complete.length - 1]?.value ?? 0,
      allTime: compound(complete),
      weekReturn: compound(complete.slice(-7)),
    },
    days,
    members,
    groups: [],
    links: [],
    strategies,
    hiddenStrategies: 0,
  };
}
