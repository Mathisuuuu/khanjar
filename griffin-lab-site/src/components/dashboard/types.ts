import type { BookStats, CanvasGroup, CanvasMember } from "@/components/books/types";
import type { ProposalStatus } from "@/lib/proposals/types";

/** Données envoyées au navigateur pour /dashboards (jamais d'identifiant interne de compte). */

/** Rendement d'une journée UTC, en % ; `partial` : la journée en cours ; `backtest` : avant la simulation en direct. */
export type DashDay = { date: string; value: number; partial?: boolean; backtest?: boolean };

export type DashStrategy = {
  /** Identifiant local du membre (« m0 »…), comme sur le canevas. */
  memberId: string;
  author: string;
  authorHref: string | null;
  self: boolean;
  /** Une fiche ou une proposition existe. */
  deposited: boolean;
  title: string;
  market: string;
  summary: string;
  status?: ProposalStatus;
  score?: number;
};

export type DashboardBook = {
  id: string;
  name: string;
  color: string;
  description: string;
  /** Book d'exemple : chiffres, stratégies et membres fictifs. */
  example: boolean;
  stats: BookStats | null;
  days: DashDay[];
  members: CanvasMember[];
  groups: CanvasGroup[];
  links: { member: string; group: string }[];
  strategies: DashStrategy[];
  /** Stratégies du book que la personne n'a pas le droit de voir. */
  hiddenStrategies: number;
};

export type DashboardTab = { id: string; name: string; color: string; example?: boolean };
