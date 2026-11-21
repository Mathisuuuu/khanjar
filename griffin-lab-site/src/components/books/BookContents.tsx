"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { saveStrategyAction } from "@/app/books/actions";
import { StatusPill } from "@/components/proposals/StatusPill";
import { Button } from "@/components/ui/Button";
import { useLocale, useMessage, useT } from "@/components/i18n/LocaleProvider";
import { intlLocale } from "@/lib/i18n/core";
import { formatNumber, formatPercent } from "@/lib/shared/format";
import { typeLabel } from "@/lib/proposals/types";
import { ACCEPTED_EXTENSIONS, formatFileSize } from "@/lib/research/files";
import styles from "./Books.module.css";
import type { BookContents as Contents, BookStats, BookStrategyEntry, StrategyFile } from "./types";

const fileKindsFr = { pdf: "PDF", script: "Script", notebook: "Notebook", data: "Données" } as const;
const fileKindsEn = { pdf: "PDF", script: "Script", notebook: "Notebook", data: "Data" } as const;

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
  const t = useT();
  const locale = useLocale();
  const pct = (value: number) => formatPercent(value, 1, true, locale);

  return (
    <aside className={styles.contents} aria-label={t(`Contenu de ${name}`, `Contents of ${name}`)}>
      <div className={styles.contentsHead}>
        <div>
          <span className={styles.contentsKicker}>{t("Contenu du book", "Book contents")}</span>
          <h2>
            <span className={styles.dot} style={{ background: color }} aria-hidden="true" />
            {name}
          </h2>
        </div>
        <button type="button" className={styles.contentsClose} onClick={onClose} aria-label={t("Fermer le contenu", "Close the contents")}>
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
              <dt>{t("Perf. 30 j", "30-day perf.")}</dt>
              <dd className={stats.monthReturn >= 0 ? styles.up : styles.down}>{pct(stats.monthReturn)}</dd>
            </div>
            <div>
              <dt>Sharpe</dt>
              <dd>{formatNumber(stats.sharpe, 2, locale)}</dd>
            </div>
            <div>
              <dt>Drawdown</dt>
              <dd>{pct(stats.maxDrawdown)}</dd>
            </div>
          </>
        )}
        <div>
          <dt>{t("Membres", "Members")}</dt>
          <dd>{memberCount}</dd>
        </div>
      </dl>

      {!contents.access ? (
        <div className={styles.contentsLocked}>
          <b>{t("Contenu réservé aux membres de ce book", "Contents reserved for this book's members")}</b>
          <p>
            {t(
              "Chaque membre y a apporté sa stratégie : fiches, rapports de test, code et fichiers. Pour y entrer, propose une stratégie ; quand elle est validée, l'équipe t'ajoute au book.",
              "Each member has brought their strategy: sheets, test reports, code and files. To get in, submit a strategy; once it's validated, the team adds you to the book.",
            )}
          </p>
          <div className={styles.contentsActions}>
            <Button href="/submit" size="sm">
              {t("Proposer une stratégie", "Submit a strategy")}
            </Button>
            <Button href="/about#rules" size="sm" variant="glass">
              {t("Les règles", "The rules")}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <h3 className={styles.contentsSection}>
            {contents.restricted ? (
              t("Ta stratégie", "Your strategy")
            ) : (
              <>
                {t("Stratégies", "Strategies")}{" "}
                <small>
                  {deposited} / {contents.strategies.length} {t("déposées", "submitted")}
                </small>
              </>
            )}
          </h3>
          {contents.restricted && (
            <p className={styles.contentsNotice}>
              {t(
                "Tu vois uniquement ta propre stratégie. Les stratégies des autres membres restent privées ; un administrateur peut t'en donner l'accès.",
                "You only see your own strategy. Other members' strategies stay private; an admin can give you access.",
              )}
            </p>
          )}
          <ul className={styles.strategyList}>
            {contents.strategies.map((entry) => (
              <li key={entry.memberId}>
                <StrategyCard bookId={bookId} entry={entry} />
              </li>
            ))}
          </ul>
          {contents.strategies.length === 0 && <p className={styles.sideNote}>{t("Aucun membre pour l'instant.", "No members yet.")}</p>}
        </>
      )}
    </aside>
  );
}

function StrategyCard({ bookId, entry }: { bookId: string; entry: BookStrategyEntry }) {
  const [editing, setEditing] = useState(false);
  const t = useT();
  const locale = useLocale();
  const dateFormat = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", year: "numeric" });
  const author = entry.authorHref ? <Link href={entry.authorHref}>{entry.author}</Link> : <span>{entry.author}</span>;

  if (editing) {
    return <StrategyForm bookId={bookId} entry={entry} onDone={() => setEditing(false)} />;
  }

  return (
    <article className={styles.strategy}>
      <div className={styles.strategyTop}>
        <span className={styles.strategyAuthor}>
          {author}
          {entry.self && <small> {t("(toi)", "(you)")}</small>}
        </span>
        {entry.status && <StatusPill status={entry.status} />}
      </div>

      {entry.deposited ? (
        <>
          <h4>{entry.title}</h4>
          <p className={styles.strategyMeta}>
            {[entry.market, entry.type && typeLabel(entry.type, locale), entry.score !== undefined && `score ${entry.score}/100`]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {entry.summary && <p className={styles.strategyText}>{entry.summary}</p>}

          {(entry.report || entry.reason) && (
            <details className={styles.strategyBlock} open>
              <summary>{t("Rapport", "Report")}</summary>
              {entry.reason && (
                <p className={styles.strategyReason}>
                  <b>{t("Script de test :", "Test script:")}</b> {entry.reason}
                </p>
              )}
              {entry.report && <p className={styles.strategyText}>{entry.report}</p>}
            </details>
          )}

          {entry.code && <CodeBlock code={entry.code} title={entry.title} />}

          {entry.paper?.url && (
            <a className={styles.strategyPaper} href={entry.paper.url} target="_blank" rel="noopener noreferrer nofollow">
              {entry.paper.title || t("Papier de référence", "Reference paper")}
              {entry.paper.authors && <small> · {entry.paper.authors}</small>}
            </a>
          )}

          {entry.files.length > 0 && <FileList files={entry.files} />}

          {entry.updatedAt && (
            <p className={styles.strategyUpdated}>{t("Mise à jour le", "Updated")} {dateFormat.format(new Date(entry.updatedAt))}</p>
          )}
        </>
      ) : (
        <p className={styles.strategyEmpty}>
          {entry.self
            ? t("Tu n'as pas encore déposé ta stratégie dans ce book.", "You haven't submitted your strategy to this book yet.")
            : t("Stratégie pas encore déposée.", "Strategy not submitted yet.")}
        </p>
      )}

      {entry.editable && (
        <button type="button" className={styles.strategyEdit} onClick={() => setEditing(true)}>
          {entry.deposited ? t("Modifier", "Edit") : entry.self ? t("Déposer ma stratégie", "Submit my strategy") : t("Remplir la fiche", "Fill in the sheet")}
        </button>
      )}
    </article>
  );
}

function CodeBlock({ code, title }: { code: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const t = useT();
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
      <summary>Code ({code.split("\n").length} {t("lignes", "lines")})</summary>
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
          {copied ? t("Copié", "Copied") : t("Copier", "Copy")}
        </button>
        <button type="button" onClick={download}>
          {t("Télécharger", "Download")}
        </button>
      </div>
      <pre className={styles.code}>
        <code>{code}</code>
      </pre>
    </details>
  );
}

function FileList({ files }: { files: StrategyFile[] }) {
  const t = useT();
  const locale = useLocale();
  const fileKinds = t<Record<StrategyFile["kind"], string>>(fileKindsFr, fileKindsEn);
  return (
    <ul className={styles.strategyFiles} aria-label={t("Fichiers", "Files")}>
      {files.map((file) => (
        <li key={file.id}>
          <a
            href={`/api/books/files/${file.id}`}
            {...(file.kind === "pdf" ? { target: "_blank", rel: "noopener" } : { download: file.name })}
          >
            <span className={styles.fileKind}>{fileKinds[file.kind]}</span>
            <span className={styles.fileName}>{file.name}</span>
            <small>{formatFileSize(file.size, locale)}</small>
          </a>
        </li>
      ))}
    </ul>
  );
}

function StrategyForm({ bookId, entry, onDone }: { bookId: string; entry: BookStrategyEntry; onDone: () => void }) {
  const [state, action, pending] = useActionState(saveStrategyAction.bind(null, bookId, entry.memberId), {});
  const [removed, setRemoved] = useState<string[]>([]);
  const t = useT();
  const message = useMessage();
  const locale = useLocale();
  const fileKinds = t<Record<StrategyFile["kind"], string>>(fileKindsFr, fileKindsEn);
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
        {entry.self ? t("Ta stratégie dans ce book", "Your strategy in this book") : t(`Stratégie de ${entry.author}`, `${entry.author}'s strategy`)}
      </p>

      {entry.proposals.length > 0 && (
        <label className={styles.field}>
          <span>{t("Proposition liée (code, score et avis du script de test)", "Linked proposal (code, score and test script verdict)")}</span>
          <select name="proposalId" defaultValue={v.proposalId}>
            <option value="">{t("Aucune", "None")}</option>
            {entry.proposals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.status === "validated" ? t("validée", "validated") : p.status === "rejected" ? t("rejetée", "rejected") : t("en cours", "in progress")})
              </option>
            ))}
          </select>
          {errors.proposalId && <small className={styles.error}>{message(errors.proposalId)}</small>}
        </label>
      )}

      <label className={styles.field}>
        <span>{t("Nom de la stratégie", "Strategy name")}</span>
        <input name="title" required maxLength={140} defaultValue={v.title} aria-invalid={!!errors.title} />
        {errors.title && <small className={styles.error}>{message(errors.title)}</small>}
      </label>
      <label className={styles.field}>
        <span>{t("Marché", "Market")}</span>
        <input name="market" maxLength={60} defaultValue={v.market} placeholder="NQ (Nasdaq 100)" />
        {errors.market && <small className={styles.error}>{message(errors.market)}</small>}
      </label>
      <label className={styles.field}>
        <span>Description</span>
        <textarea name="summary" rows={4} maxLength={4000} defaultValue={v.summary} placeholder={t("Idée, règles d'entrée et de sortie, timeframe…", "Idea, entry and exit rules, timeframe…")} />
        {errors.summary && <small className={styles.error}>{message(errors.summary)}</small>}
      </label>
      <label className={styles.field}>
        <span>{t("Rapport", "Report")}</span>
        <textarea name="report" rows={4} maxLength={20000} defaultValue={v.report} placeholder={t("Résultats du backtest, période, coûts, limites…", "Backtest results, period, costs, limitations…")} />
        {errors.report && <small className={styles.error}>{message(errors.report)}</small>}
      </label>

      {entry.files.length > 0 && (
        <div className={styles.field}>
          <span>{t("Fichiers actuels", "Current files")}</span>
          <ul className={styles.strategyFiles}>
            {entry.files.map((file) => {
              const gone = removed.includes(file.id);
              return (
                <li key={file.id} className={gone ? styles.fileGone : undefined}>
                  <div>
                    {gone && <input type="hidden" name="remove" value={file.id} />}
                    <span className={styles.fileKind}>{fileKinds[file.kind]}</span>
                    <span className={styles.fileName}>{file.name}</span>
                    <small>{gone ? t("sera retiré", "will be removed") : formatFileSize(file.size, locale)}</small>
                    <button type="button" className={styles.fileToggle} onClick={() => toggle(file.id)}>
                      {gone ? t("Garder", "Keep") : t("Retirer", "Remove")}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <label className={styles.field}>
        <span>{t("Ajouter des fichiers (rapport PDF, code, données)", "Add files (PDF report, code, data)")}</span>
        <input name="files" type="file" multiple accept={ACCEPTED_EXTENSIONS} />
        <small>{t("10 fichiers de 10 Mo maximum par stratégie.", "Up to 10 files of 10 MB per strategy.")}</small>
        {errors.files && <small className={styles.error}>{message(errors.files)}</small>}
      </label>

      {state.message && !state.ok && <p className={styles.error}>{message(state.message)}</p>}

      <div className={styles.contentsActions}>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? t("Enregistrement…", "Saving…") : t("Enregistrer", "Save")}
        </Button>
        <button type="button" className={styles.strategyEdit} onClick={onDone}>
          {t("Annuler", "Cancel")}
        </button>
      </div>
    </form>
  );
}
