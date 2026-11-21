"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { saveStrategyAction } from "@/app/books/actions";
import { StatusPill } from "@/components/proposals/StatusPill";
import { Button } from "@/components/ui/Button";
import { typeLabels } from "@/lib/proposals/types";
import { ACCEPTED_EXTENSIONS, formatFileSize } from "@/lib/research/files";
import styles from "./Books.module.css";
import type { BookContents as Contents, BookStats, BookStrategyEntry, StrategyFile } from "./types";

const fileKinds = { pdf: "PDF", script: "Script", notebook: "Notebook", data: "Données" } as const;

const pct = (value: number) =>
  `${value > 0 ? "+" : ""}${value.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

/** Extension probable d'un code collé dans une proposition. */
function codeExtension(code: string) {
  if (/\/\/@version|^\s*(strategy|indicator)\(/m.test(code)) return "pine";
  if (/^\s*(import|from|def|class)\s/m.test(code)) return "py";
  return "txt";
}

type Props = {
  bookId: string;
  name: string;
  color: string;
  description: string;
  stats: BookStats | null;
  memberCount: number;
  contents: Contents;
  onClose: () => void;
};

/**
 * Panneau « Contenu du book », ouvert dès qu'on choisit un book : chiffres,
 * puis la stratégie apportée par chaque membre (description, rapport, code,
 * fichiers). Le serveur n'envoie que ce que la personne a le droit de voir :
 * tout pour un administrateur ou un membre autorisé, sa seule stratégie sinon.
 */
export function BookContents({ bookId, name, color, description, stats, memberCount, contents, onClose }: Props) {
  const deposited = contents.access ? contents.strategies.filter((s) => s.deposited).length : 0;

  return (
    <aside className={styles.contents} aria-label={`Contenu de ${name}`}>
      <div className={styles.contentsHead}>
        <div>
          <span className={styles.contentsKicker}>Contenu du book</span>
          <h2>
            <span className={styles.dot} style={{ background: color }} aria-hidden="true" />
            {name}
          </h2>
        </div>
        <button type="button" className={styles.contentsClose} onClick={onClose} aria-label="Fermer le contenu">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {description && <p className={styles.contentsLead}>{description}</p>}

      <dl className={styles.contentsStats}>
        {stats && (
          <>
            <div>
              <dt>Rendement 30 j</dt>
              <dd className={stats.monthReturn >= 0 ? styles.up : styles.down}>{pct(stats.monthReturn)}</dd>
            </div>
            <div>
              <dt>Sharpe</dt>
              <dd>{stats.sharpe.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</dd>
            </div>
            <div>
              <dt>Drawdown max</dt>
              <dd>{pct(stats.maxDrawdown)}</dd>
            </div>
          </>
        )}
        <div>
          <dt>Membres</dt>
          <dd>{memberCount}</dd>
        </div>
      </dl>

      {!contents.access ? (
        <div className={styles.contentsLocked}>
          <b>Contenu réservé aux membres de ce book</b>
          <p>
            Chaque membre y a apporté sa stratégie : fiches, rapports de test, code et fichiers. Pour y entrer, propose
            une stratégie ; quand elle est validée, l&apos;équipe t&apos;ajoute au book.
          </p>
          <div className={styles.contentsActions}>
            <Button href="/proposer" size="sm">
              Proposer une stratégie
            </Button>
            <Button href="/a-propos#regles" size="sm" variant="glass">
              Les règles
            </Button>
          </div>
        </div>
      ) : (
        <>
          <h3 className={styles.contentsSection}>
            {contents.restricted ? (
              "Ta stratégie"
            ) : (
              <>
                Stratégies <small>{deposited} / {contents.strategies.length} déposées</small>
              </>
            )}
          </h3>
          {contents.restricted && (
            <p className={styles.contentsNotice}>
              Tu vois uniquement ta propre stratégie. Les stratégies des autres membres restent privées ; un
              administrateur peut t&apos;en donner l&apos;accès.
            </p>
          )}
          <ul className={styles.strategyList}>
            {contents.strategies.map((entry) => (
              <li key={entry.memberId}>
                <StrategyCard bookId={bookId} entry={entry} />
              </li>
            ))}
          </ul>
          {contents.strategies.length === 0 && <p className={styles.sideNote}>Aucun membre pour l&apos;instant.</p>}
        </>
      )}
    </aside>
  );
}

function StrategyCard({ bookId, entry }: { bookId: string; entry: BookStrategyEntry }) {
  const [editing, setEditing] = useState(false);
  const author = entry.authorHref ? <Link href={entry.authorHref}>{entry.author}</Link> : <span>{entry.author}</span>;

  if (editing) {
    return <StrategyForm bookId={bookId} entry={entry} onDone={() => setEditing(false)} />;
  }

  return (
    <article className={styles.strategy}>
      <div className={styles.strategyTop}>
        <span className={styles.strategyAuthor}>
          {author}
          {entry.self && <small> (toi)</small>}
        </span>
        {entry.status && <StatusPill status={entry.status} />}
      </div>

      {entry.deposited ? (
        <>
          <h4>{entry.title}</h4>
          <p className={styles.strategyMeta}>
            {[entry.market, entry.type && typeLabels[entry.type], entry.score !== undefined && `score ${entry.score}/100`]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {entry.summary && <p className={styles.strategyText}>{entry.summary}</p>}

          {(entry.report || entry.reason) && (
            <details className={styles.strategyBlock} open>
              <summary>Rapport</summary>
              {entry.reason && (
                <p className={styles.strategyReason}>
                  <b>Script de test :</b> {entry.reason}
                </p>
              )}
              {entry.report && <p className={styles.strategyText}>{entry.report}</p>}
            </details>
          )}

          {entry.code && <CodeBlock code={entry.code} title={entry.title} />}

          {entry.paper?.url && (
            <a className={styles.strategyPaper} href={entry.paper.url} target="_blank" rel="noopener noreferrer nofollow">
              {entry.paper.title || "Papier de référence"}
              {entry.paper.authors && <small> · {entry.paper.authors}</small>}
            </a>
          )}

          {entry.files.length > 0 && <FileList files={entry.files} />}

          {entry.updatedAt && (
            <p className={styles.strategyUpdated}>Mise à jour le {dateFormat.format(new Date(entry.updatedAt))}</p>
          )}
        </>
      ) : (
        <p className={styles.strategyEmpty}>
          {entry.self ? "Tu n'as pas encore déposé ta stratégie dans ce book." : "Stratégie pas encore déposée."}
        </p>
      )}

      {entry.editable && (
        <button type="button" className={styles.strategyEdit} onClick={() => setEditing(true)}>
          {entry.deposited ? "Modifier" : entry.self ? "Déposer ma stratégie" : "Remplir la fiche"}
        </button>
      )}
    </article>
  );
}

function CodeBlock({ code, title }: { code: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const download = () => {
    const ext = codeExtension(code);
    const url = URL.createObjectURL(new Blob([code], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 60) || "strategie"}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <details className={styles.strategyBlock}>
      <summary>Code ({code.split("\n").length} lignes)</summary>
      <div className={styles.codeActions}>
        <button
          type="button"
          onClick={() =>
            navigator.clipboard
              .writeText(code)
              .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              })
              .catch(() => undefined)
          }
        >
          {copied ? "Copié" : "Copier"}
        </button>
        <button type="button" onClick={download}>
          Télécharger
        </button>
      </div>
      <pre className={styles.code}>
        <code>{code}</code>
      </pre>
    </details>
  );
}

function FileList({ files }: { files: StrategyFile[] }) {
  return (
    <ul className={styles.strategyFiles} aria-label="Fichiers">
      {files.map((file) => (
        <li key={file.id}>
          <a
            href={`/api/books/fichiers/${file.id}`}
            {...(file.kind === "pdf" ? { target: "_blank", rel: "noopener" } : { download: file.name })}
          >
            <span className={styles.fileKind}>{fileKinds[file.kind]}</span>
            <span className={styles.fileName}>{file.name}</span>
            <small>{formatFileSize(file.size)}</small>
          </a>
        </li>
      ))}
    </ul>
  );
}

function StrategyForm({ bookId, entry, onDone }: { bookId: string; entry: BookStrategyEntry; onDone: () => void }) {
  const [state, action, pending] = useActionState(saveStrategyAction.bind(null, bookId, entry.memberId), {});
  const [removed, setRemoved] = useState<string[]>([]);
  const errors = state.fieldErrors ?? {};
  const v = state.values ?? {
    title: entry.title,
    market: entry.market,
    summary: entry.summary,
    report: entry.report,
    proposalId: entry.proposalId ?? "",
  };

  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  const toggle = (id: string) => setRemoved((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  return (
    <form action={action} className={`${styles.strategy} ${styles.form}`}>
      <p className={styles.strategyAuthor}>
        {entry.self ? "Ta stratégie dans ce book" : `Stratégie de ${entry.author}`}
      </p>

      {entry.proposals.length > 0 && (
        <label className={styles.field}>
          <span>Proposition liée (code, score et avis du script de test)</span>
          <select name="proposalId" defaultValue={v.proposalId}>
            <option value="">Aucune</option>
            {entry.proposals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.status === "validated" ? "validée" : p.status === "rejected" ? "rejetée" : "en cours"})
              </option>
            ))}
          </select>
          {errors.proposalId && <small className={styles.error}>{errors.proposalId}</small>}
        </label>
      )}

      <label className={styles.field}>
        <span>Nom de la stratégie</span>
        <input name="title" required maxLength={140} defaultValue={v.title} aria-invalid={!!errors.title} />
        {errors.title && <small className={styles.error}>{errors.title}</small>}
      </label>
      <label className={styles.field}>
        <span>Marché</span>
        <input name="market" maxLength={60} defaultValue={v.market} placeholder="NQ (Nasdaq 100)" />
        {errors.market && <small className={styles.error}>{errors.market}</small>}
      </label>
      <label className={styles.field}>
        <span>Description</span>
        <textarea name="summary" rows={4} maxLength={4000} defaultValue={v.summary} placeholder="Idée, règles d'entrée et de sortie, timeframe…" />
        {errors.summary && <small className={styles.error}>{errors.summary}</small>}
      </label>
      <label className={styles.field}>
        <span>Rapport</span>
        <textarea name="report" rows={4} maxLength={20000} defaultValue={v.report} placeholder="Résultats du backtest, période, coûts, limites…" />
        {errors.report && <small className={styles.error}>{errors.report}</small>}
      </label>

      {entry.files.length > 0 && (
        <div className={styles.field}>
          <span>Fichiers actuels</span>
          <ul className={styles.strategyFiles}>
            {entry.files.map((file) => {
              const gone = removed.includes(file.id);
              return (
                <li key={file.id} className={gone ? styles.fileGone : undefined}>
                  <div>
                    {gone && <input type="hidden" name="remove" value={file.id} />}
                    <span className={styles.fileKind}>{fileKinds[file.kind]}</span>
                    <span className={styles.fileName}>{file.name}</span>
                    <small>{gone ? "sera retiré" : formatFileSize(file.size)}</small>
                    <button type="button" className={styles.fileToggle} onClick={() => toggle(file.id)}>
                      {gone ? "Garder" : "Retirer"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <label className={styles.field}>
        <span>Ajouter des fichiers (rapport PDF, code, données)</span>
        <input name="files" type="file" multiple accept={ACCEPTED_EXTENSIONS} />
        <small>10 fichiers de 10 Mo maximum par stratégie.</small>
        {errors.files && <small className={styles.error}>{errors.files}</small>}
      </label>

      {state.message && !state.ok && <p className={styles.error}>{state.message}</p>}

      <div className={styles.contentsActions}>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <button type="button" className={styles.strategyEdit} onClick={onDone}>
          Annuler
        </button>
      </div>
    </form>
  );
}
