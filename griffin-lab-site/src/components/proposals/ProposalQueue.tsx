"use client";

import { useState } from "react";
import { Mascot } from "@/components/ui/Mascot";
import { formatShortDate } from "@/lib/format";
import { PROPOSAL_STATUSES, statusLabels, typeLabels, type ProposalStatus, type PublicProposal } from "@/lib/proposals/types";
import panel from "./Panel.module.css";
import { StatusPill } from "./StatusPill";
import styles from "./ProposalQueue.module.css";

type Filter = "all" | ProposalStatus;

type ProposalQueueProps = {
  proposals: PublicProposal[];
  loading: boolean;
  error: string | null;
};

const EXCERPT = 220;

/** Propositions de l'utilisateur connecté (l'API ne renvoie que les siennes). */
export function ProposalQueue({ proposals, loading, error }: ProposalQueueProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = filter === "all" ? proposals : proposals.filter((p) => p.status === filter);
  const count = (status: Filter) => (status === "all" ? proposals.length : proposals.filter((p) => p.status === status).length);
  const filters: Filter[] = ["all", ...PROPOSAL_STATUSES];

  return (
    <div className={panel.panel}>
      <div className={panel.head}>
        <h2>Mes propositions</h2>
        <div className={styles.chips} role="group" aria-label="Filtrer par statut">
          {filters.map((f) => (
            <button key={f} type="button" className={styles.chip} data-status={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === "all" ? "Toutes" : statusLabels[f]} <b>{count(f)}</b>
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className={panel.empty}>
          <Mascot width={34} />
          <b>{emptyTitle({ loading, error, total: proposals.length })}</b>
          <span>
            {error
              ? "Recharge la page dans un instant."
              : proposals.length
                ? "Choisis un autre filtre."
                : "Tes propositions apparaissent ici avec leur statut. Toi seul les vois."}
          </span>
        </div>
      ) : (
        <ul className={styles.list} aria-live="polite">
          {visible.map((p) => {
            return (
              <li key={p.id} className={styles.item} data-status={p.status}>
                <div className={styles.top}>
                  <h3>{p.title}</h3>
                  <StatusPill status={p.status} />
                </div>
                <div className={styles.meta}>
                  <span>@{p.pseudo}</span>
                  <span>{typeLabels[p.type]}</span>
                  <span>{p.market}</span>
                  <span>{formatShortDate(p.createdAt)}</span>
                </div>
                <p>
                  {p.description.slice(0, EXCERPT)}
                  {p.description.length > EXCERPT && "…"}
                </p>
                {p.paper?.title && (
                  <p>
                    <b className={styles.paperLabel}>SSRN :</b> {p.paper.title}
                    {p.paper.authors && ` · ${p.paper.authors}`}
                  </p>
                )}
                {p.status === "rejected" && p.reason && <div className={styles.reason}>Raison : {p.reason}</div>}
                {p.status === "validated" && (
                  <div className={`${styles.reason} ${styles.positive}`}>
                    Score {p.score ?? "—"}/100{p.reason && ` · ${p.reason}`}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function emptyTitle({ loading, error, total }: { loading: boolean; error: string | null; total: number }) {
  if (loading) return "Chargement de la file…";
  if (error) return "Impossible de charger la file";
  return total ? "Aucune proposition avec ce statut" : "Tu n'as encore rien proposé";
}
