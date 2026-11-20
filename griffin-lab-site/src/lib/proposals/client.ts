/** Appels à l'API des propositions depuis le navigateur. */

import type { ModerationInput, NewProposalInput } from "./schema";
import type { PublicProposal } from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = (await response.json().catch(() => ({}))) as { error?: string; fields?: Record<string, string> } & T;
  if (!response.ok) {
    throw new ApiError(data.error ?? "Une erreur est survenue.", response.status, data.fields);
  }
  return data;
}

/**
 * Sans jeton : les propositions de l'utilisateur connecté. Avec le jeton de
 * modération, ou `all` pour un administrateur connecté : toutes.
 */
export async function fetchProposals(adminToken?: string, all = false): Promise<PublicProposal[]> {
  const data = await request<{ proposals: PublicProposal[] }>(all ? "/api/proposals?tout=1" : "/api/proposals", {
    cache: "no-store",
    headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : undefined,
  });
  return data.proposals;
}

export async function submitProposal(input: NewProposalInput): Promise<PublicProposal> {
  const data = await request<{ proposal: PublicProposal }>("/api/proposals", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.proposal;
}

/** Sans jeton : la session d'un administrateur sert d'autorisation. */
export async function moderateProposal(id: string, input: ModerationInput, token?: string): Promise<PublicProposal> {
  const data = await request<{ proposal: PublicProposal }>(`/api/proposals/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return data.proposal;
}
