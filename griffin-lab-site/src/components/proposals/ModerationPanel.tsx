"use client";

import Link from "next/link";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { deleteProposalAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ApiError, fetchProposals, moderateProposal } from "@/lib/proposals/client";
import { PROPOSAL_STATUSES, statusLabels, typeLabels, type ProposalStatus, type PublicProposal } from "@/lib/proposals/types";
import panel from "./Panel.module.css";
import { StatusPill } from "./StatusPill";
import styles from "./ModerationPanel.module.css";

/** Le jeton reste dans l'onglet (sessionStorage) et disparaît à sa fermeture. */
const TOKEN_KEY = "griffin-lab:jeton-moderation";

/**
 * `sessionAdmin` : la personne connectée est administrateur ; sa session sert
 * d'autorisation (pas de jeton) et elle peut supprimer des propositions.
 */
export function ModerationPanel({ sessionAdmin = false }: { sessionAdmin?: boolean }) {
  const [token, setToken] = useState("");
  const [proposals, setProposals] = useState<PublicProposal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const authorized = sessionAdmin || !!token;

  useEffect(() => {
    if (sessionAdmin) return;
    try {
      setToken(sessionStorage.getItem(TOKEN_KEY) ?? "");
    } catch {
      // stockage indisponible
    }
  }, [sessionAdmin]);

  // la liste complète n'est renvoyée qu'avec un jeton valide ou une session admin
  useEffect(() => {
    if (!authorized) {
      setProposals([]);
      setError("Saisis le jeton pour afficher les propositions.");
      return;
    }
    const id = window.setTimeout(
      () => {
        fetchProposals(sessionAdmin ? undefined : token, sessionAdmin)
          .then((list) => {
            setProposals(list);
            setError(null);
          })
          .catch((e: unknown) => {
            setProposals([]);
            setError(
              e instanceof ApiError && e.status === 401 ? "Jeton invalide." : e instanceof Error ? e.message : "Erreur inconnue",
            );
          });
      },
      sessionAdmin ? 0 : 400,
    );
    return () => window.clearTimeout(id);
  }, [token, sessionAdmin, authorized]);

  const saveToken = (value: string) => {
    setToken(value);
    try {
      sessionStorage.setItem(TOKEN_KEY, value);
    } catch {
      // stockage indisponible
    }
  };

  const replace = (updated: PublicProposal) =>
    setProposals((list) => list.map((p) => (p.id === updated.id ? updated : p)));
  const remove = (id: string) => setProposals((list) => list.filter((p) => p.id !== id));

  return (
    <div className={styles.stack}>
      <div className={panel.panel}>
        <div className={panel.body}>
          {sessionAdmin ? (
            <p className={panel.notice}>
              <Icon name="info" />
              Connecté en administrateur : aucun jeton n&apos;est nécessaire.{" "}
              <Link href="/admin">Retour à l&apos;administration</Link>
            </p>
          ) : (
            <>
              <label className={styles.tokenField}>
                <span>Jeton de modération</span>
                <input
                  type="password"
                  autoComplete="off"
                  value={token}
                  onChange={(e) => saveToken(e.target.value)}
                  placeholder="valeur de ADMIN_TOKEN"
                />
              </label>
              <p className={panel.notice}>
                <Icon name="info" />
                Le jeton est vérifié par le serveur à chaque modification. Il est défini dans la variable
                d&apos;environnement ADMIN_TOKEN. Un compte administrateur n&apos;en a pas besoin.
              </p>
            </>
          )}
        </div>
      </div>

      <div className={panel.panel}>
        <div className={panel.head}>
          <h2>Propositions</h2>
          <span className={panel.command}>{proposals.length} au total</span>
        </div>
        {error && <p className={panel.empty}>{error}</p>}
        {!error && proposals.length === 0 && <p className={panel.empty}>Aucune proposition pour l&apos;instant.</p>}
        <ul className={styles.list}>
          {proposals.map((p) => (
            <ModerationItem
              key={p.id}
              proposal={p}
              token={sessionAdmin ? undefined : token}
              authorized={authorized}
              canDelete={sessionAdmin}
              onUpdated={replace}
              onDeleted={remove}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

type ItemProps = {
  proposal: PublicProposal;
  token?: string;
  authorized: boolean;
  canDelete: boolean;
  onUpdated: (proposal: PublicProposal) => void;
  onDeleted: (id: string) => void;
};

function ModerationItem({ proposal, token, authorized, canDelete, onUpdated, onDeleted }: ItemProps) {
  const [status, setStatus] = useState<ProposalStatus>(proposal.status);
  const [score, setScore] = useState(proposal.score?.toString() ?? "");
  const [reason, setReason] = useState(proposal.reason ?? "");
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, startDelete] = useTransition();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const updated = await moderateProposal(
        proposal.id,
        { status, score: score === "" ? undefined : Number(score), reason: reason || undefined },
        token,
      );
      onUpdated(updated);
      setFeedback({ ok: true, text: "Enregistré" });
    } catch (error) {
      setFeedback({ ok: false, text: error instanceof ApiError ? error.message : "Échec de l'enregistrement" });
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!window.confirm(`Supprimer la proposition « ${proposal.title} » ? C'est définitif.`)) return;
    startDelete(async () => {
      try {
        await deleteProposalAction(proposal.id);
        onDeleted(proposal.id);
      } catch {
        setFeedback({ ok: false, text: "Échec de la suppression" });
      }
    });
  }

  return (
    <li className={styles.item}>
      <div className={styles.top}>
        <h3>{proposal.title}</h3>
        <StatusPill status={proposal.status} />
      </div>
      <p className={styles.meta}>
        @{proposal.pseudo} · {typeLabels[proposal.type]} · {proposal.market}
      </p>
      <form className={styles.form} onSubmit={handleSubmit}>
        <select value={status} onChange={(e) => setStatus(e.target.value as ProposalStatus)} aria-label="Statut">
          {PROPOSAL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabels[s]}
            </option>
          ))}
        </select>
        <input type="number" min={0} max={100} placeholder="Score" value={score} onChange={(e) => setScore(e.target.value)} aria-label="Score sur 100" />
        <input type="text" maxLength={300} placeholder="Raison (affichée à l'auteur)" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Raison" />
        <Button type="submit" variant="glass" size="sm" disabled={saving || !authorized}>
          {saving ? "…" : "Enregistrer"}
        </Button>
        {canDelete && (
          <Button type="button" variant="glass" size="sm" disabled={deleting} onClick={handleDelete}>
            {deleting ? "…" : "Supprimer"}
          </Button>
        )}
      </form>
      {feedback && <p className={feedback.ok ? styles.ok : styles.error}>{feedback.text}</p>}
    </li>
  );
}
