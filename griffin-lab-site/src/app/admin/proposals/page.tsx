import type { Metadata } from "next";
import { ProposalsInbox, type InboxItem } from "@/components/admin/ProposalsInbox";
import { isUnplaced, listAdminProposals, type ProposalFilter } from "@/lib/admin/proposals";
import { PROPOSAL_STATUSES } from "@/lib/proposals/types";
import { requireAdmin } from "@/lib/auth/viewer";

export const metadata: Metadata = { title: "Propositions · Administration", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ status?: string; q?: string; market?: string; id?: string }> };

const FILTERS: ProposalFilter[] = ["pending", "testing", "validated", "unplaced", "rejected", "all"];

/**
 * Administration des propositions : liste filtrable à gauche, proposition
 * choisie à droite (décision, score, avis, placement dans les books).
 * Tout l'état (filtre, recherche, sélection) est dans l'URL.
 */
export default async function AdminProposalsPage({ searchParams }: Props) {
  await requireAdmin();
  const params = await searchParams;
  const { proposals, books } = await listAdminProposals();

  const counts = {
    all: proposals.length,
    unplaced: proposals.filter(isUnplaced).length,
    ...Object.fromEntries(PROPOSAL_STATUSES.map((s) => [s, proposals.filter((p) => p.status === s).length])),
  } as Record<ProposalFilter, number>;

  // par défaut : ce qui attend une décision, sinon tout
  const filter: ProposalFilter = FILTERS.includes(params.status as ProposalFilter)
    ? (params.status as ProposalFilter)
    : counts.pending > 0
      ? "pending"
      : "all";
  const q = (params.q ?? "").trim().slice(0, 100);
  const market = (params.market ?? "").slice(0, 60);
  const needle = q.toLocaleLowerCase("fr");

  const visible = proposals
    .filter((p) => (filter === "all" ? true : filter === "unplaced" ? isUnplaced(p) : p.status === filter))
    .filter((p) => !market || p.market === market)
    .filter(
      (p) =>
        !needle ||
        `${p.title} ${p.author.pseudo} ${p.pseudo} ${p.description}`.toLocaleLowerCase("fr").includes(needle),
    )
    // les plus anciennes d'abord quand on traite une file ; les plus récentes sinon
    .sort((a, b) =>
      filter === "pending" || filter === "testing" || filter === "unplaced"
        ? a.createdAt.localeCompare(b.createdAt)
        : b.createdAt.localeCompare(a.createdAt),
    );

  const selected = visible.find((p) => p.id === params.id) ?? proposals.find((p) => p.id === params.id) ?? null;
  const index = selected ? visible.findIndex((p) => p.id === selected.id) : -1;

  const items: InboxItem[] = visible.map((p) => ({
    id: p.id,
    title: p.title,
    pseudo: p.author.pseudo,
    market: p.market,
    type: p.type,
    status: p.status,
    score: p.score ?? null,
    createdAt: p.createdAt,
    unplaced: isUnplaced(p),
    books: p.placements.map((b) => b.color),
  }));

  return (
    <ProposalsInbox
      filter={filter}
      q={q}
      market={market}
      markets={[...new Set(proposals.map((p) => p.market))].sort()}
      counts={counts}
      items={items}
      selected={selected}
      books={books}
      prevId={index > 0 ? visible[index - 1].id : null}
      nextId={index >= 0 && index < visible.length - 1 ? visible[index + 1].id : (visible.find((p) => p.id !== selected?.id)?.id ?? null)}
    />
  );
}
