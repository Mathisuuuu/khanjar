"use client";

import { useState } from "react";
import { Minitel } from "@/components/ui/Minitel";
import { useLocale, useMessage } from "@/components/i18n/LocaleProvider";
import { formatShortDate } from "@/lib/shared/format";
import { makeT } from "@/lib/i18n/core";
import { marketLabel, PROPOSAL_STATUSES, statusLabel, typeLabel, type ProposalStatus, type PublicProposal } from "@/lib/proposals/types";
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
  const locale = useLocale();
  const t = makeT(locale);
  const message = useMessage();
  const [filter, setFilter] = useState<Filter>("all");
  const visible = filter === "all" ? proposals : proposals.filter((p) => p.status === filter);
  const count = (status: Filter) => (status === "all" ? proposals.length : proposals.filter((p) => p.status === status).length);
  const filters: Filter[] = ["all", ...PROPOSAL_STATUSES];

  return (
    <div className={panel.panel}>
      <div className={panel.head}>
        <h2>{t("Mes propositions", "My submissions")}</h2>
        <div className={styles.chips} role="group" aria-label={t("Filtrer par statut", "Filter by status")}>
          {filters.map((f) => (
            <button key={f} type="button" className={styles.chip} data-status={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === "all" ? t("Toutes", "All") : statusLabel(f, locale)} <b>{count(f)}</b>
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className={panel.empty}>
          <Minitel width={40} auto />
          <b>{emptyTitle({ loading, error, total: proposals.length, t })}</b>
          <span>
            {error
              ? t("Recharge la page dans un instant.", "Reload the page in a moment.")
              : proposals.length
                ? t("Choisis un autre filtre.", "Pick another filter.")
                : t(
                    "Tes propositions apparaissent ici avec leur statut. Toi seul les vois.",
                    "Your submissions appear here with their status. Only you can see them.",
                  )}
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
                  <span>{typeLabel(p.type, locale)}</span>
                  <span>{marketLabel(p.market, locale)}</span>
                  <span>{formatShortDate(p.createdAt, locale)}</span>
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
                {p.status === "rejected" && p.reason && <div className={styles.reason}>{t("Raison :", "Reason:")} {message(p.reason)}</div>}
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

function emptyTitle({
  loading,
  error,
  total,
  t,
}: {
  loading: boolean;
  error: string | null;
  total: number;
  t: ReturnType<typeof makeT>;
}) {
  if (loading) return t("Chargement de la file…", "Loading the queue…");
  if (error) return t("Impossible de charger la file", "Couldn't load the queue");
  return total ? t("Aucune proposition avec ce statut", "No submission with this status") : t("Tu n'as encore rien proposé", "You haven't submitted anything yet");
}
