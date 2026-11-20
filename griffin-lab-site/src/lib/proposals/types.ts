/** Modèle d'une proposition de stratégie, partagé entre client et serveur. */

export const PROPOSAL_TYPES = ["idea", "script", "paper"] as const;
export type ProposalType = (typeof PROPOSAL_TYPES)[number];

export const PROPOSAL_STATUSES = ["pending", "testing", "validated", "rejected"] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export const MARKETS = [
  "NQ (Nasdaq 100)",
  "ES (S&P 500)",
  "YM (Dow Jones)",
  "CL (pétrole)",
  "GC (or)",
  "EUR/USD",
  "BTC",
  "Actions US",
  "Multi-actifs",
  "Autre",
] as const;

export type PaperReference = {
  title: string;
  authors: string;
  url: string;
};

export type Proposal = {
  id: string;
  /** Compte de l'auteur, sous la forme « fournisseur:identifiant » (voir lib/proposals/author.ts). */
  authorId: string;
  type: ProposalType;
  pseudo: string;
  market: string;
  title: string;
  description: string;
  code?: string;
  paper?: PaperReference;
  status: ProposalStatus;
  score?: number;
  reason?: string;
  createdAt: string; // ISO 8601
  updatedAt: string;
};

/** Version renvoyée par l'API : sans le code de la stratégie ni l'identifiant interne de l'auteur. */
export type PublicProposal = Omit<Proposal, "code" | "authorId">;

export function toPublic({ code: _code, authorId: _author, ...rest }: Proposal): PublicProposal {
  return rest;
}

export const typeLabels: Record<ProposalType, string> = {
  idea: "Idée",
  script: "Script",
  paper: "Papier SSRN",
};

export const statusLabels: Record<ProposalStatus, string> = {
  pending: "En file",
  testing: "En test",
  validated: "Validé",
  rejected: "Rejeté",
};
