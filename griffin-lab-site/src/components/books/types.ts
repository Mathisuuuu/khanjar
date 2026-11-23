import type { PaperReference, ProposalStatus, ProposalType } from "@/lib/proposals/types";
import type { AttachmentKind } from "@/lib/research/types";

/** Données envoyées au navigateur pour la page Books (jamais d'identifiant interne de compte, sauf pour l'équipe). */

/**
 * `dayReturn` (dernière journée complète), `allTime` et `weekReturn` : chiffres en direct
 * de la simulation horaire (lib/books/simulation.ts).
 */
export type BookStats = {
  strategies: number;
  sharpe: number;
  maxDrawdown: number;
  dayReturn: number;
  allTime: number | null;
  weekReturn?: number;
};

export type BookListItem = {
  id: string;
  name: string;
  color: string;
  /** Visiteur non connecté : le book ne s'ouvre pas. */
  locked: boolean;
  /** La personne connectée est membre de ce book. */
  member: boolean;
  dayReturn: number | null;
};

/** Champs modifiables par l'équipe (les chiffres sont des chaînes pour le formulaire). */
export type EditableBook = {
  name: string;
  description: string;
  color: string;
  strategies: string;
  sharpe: string;
  maxDrawdown: string;
  dailyReturn: string;
  allTime: string;
};

export type CanvasMember = {
  /** Identifiant local au canevas (« m0 », « m1 »…), pas l'identifiant du compte. */
  id: string;
  name: string;
  href: string | null;
  anonymous: boolean;
  /** Masqué pour les autres, visible ici pour soi, l'équipe ou un admin. */
  masked: boolean;
  self: boolean;
  /** Photo de profil Discord ; jamais pour un membre anonyme. */
  avatar: string | null;
};

export type CanvasGroup = { id: string; name: string; href: string };

export type SelectedBook =
  | { id: string; name: string; color: string; access: false }
  | {
      id: string;
      name: string;
      color: string;
      description: string;
      stats: BookStats | null;
      access: true;
      members: CanvasMember[];
      groups: CanvasGroup[];
      /** Liens membre → groupe de recherche où il a publié. */
      links: { member: string; group: string }[];
      /** Contenu du book : réservé à ses membres et à l'équipe. */
      contents: BookContents;
    };

export type StrategyFile = { id: string; name: string; size: number; kind: AttachmentKind };

export type ProposalOption = { id: string; title: string; status: ProposalStatus };

/** La stratégie apportée par un membre : fiche déposée et/ou proposition validée. */
export type BookStrategyEntry = {
  /** Même identifiant local que le membre du canevas (« m0 »…). */
  memberId: string;
  author: string;
  authorHref: string | null;
  self: boolean;
  /** Une fiche ou une proposition existe pour ce membre. */
  deposited: boolean;
  title: string;
  market: string;
  summary: string;
  report: string;
  proposalId: string | null;
  type?: ProposalType;
  status?: ProposalStatus;
  score?: number;
  /** Avis du script de test (raison de la validation). */
  reason?: string;
  code?: string;
  paper?: PaperReference;
  files: StrategyFile[];
  updatedAt?: string;
  /** La personne connectée peut modifier cette fiche (la sienne, ou l'équipe). */
  editable: boolean;
  /** Propositions du membre, pour lier la fiche (seulement si `editable`). */
  proposals: ProposalOption[];
};

/**
 * `restricted` : membre non autorisé par un administrateur. Le serveur
 * n'envoie alors que sa propre stratégie, jamais celles des autres.
 */
export type BookContents = { access: false } | { access: true; restricted: boolean; strategies: BookStrategyEntry[] };

/** Pour l'équipe : gestion des membres d'un book. */
export type ManagedMember = { userKey: string; name: string; masked: boolean; canView: boolean };
