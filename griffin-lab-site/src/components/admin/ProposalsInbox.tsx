"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  deleteProposalAdminAction,
  moderateAction,
  placeInBookAction,
  removeFromBookAction,
  type AdminResult,
} from "@/app/admin/propositions/actions";
import { StatusPill } from "@/components/proposals/StatusPill";
import type { AdminProposal, ProposalFilter } from "@/lib/admin/proposals";
import { typeLabels, type ProposalStatus, type ProposalType } from "@/lib/proposals/types";
import styles from "./ProposalsInbox.module.css";

export type InboxItem = {
  id: string;
  title: string;
  pseudo: string;
  market: string;
  type: ProposalType;
  status: ProposalStatus;
  score: number | null;
  createdAt: string;
  unplaced: boolean;
  /** Couleurs des books où l'auteur se trouve. */
  books: string[];
};

type Props = {
  filter: ProposalFilter;
  q: string;
  market: string;
  markets: string[];
  counts: Record<ProposalFilter, number>;
  items: InboxItem[];
  selected: AdminProposal | null;
  books: { id: string; name: string; color: string }[];
  prevId: string | null;
  nextId: string | null;
};

const TABS: { id: ProposalFilter; label: string }[] = [
  { id: "pending", label: "En file" },
  { id: "testing", label: "En test" },
  { id: "validated", label: "Validées" },
  { id: "unplaced", label: "À placer" },
  { id: "rejected", label: "Refusées" },
  { id: "all", label: "Toutes" },
];

const DECISIONS: { status: ProposalStatus; label: string; key: string; tone: string }[] = [
  { status: "validated", label: "Valider", key: "V", tone: "ok" },
  { status: "testing", label: "Mettre en test", key: "T", tone: "test" },
  { status: "pending", label: "Remettre en file", key: "F", tone: "neutral" },
  { status: "rejected", label: "Refuser", key: "R", tone: "danger" },
];

/** Raisons fréquentes, insérées d'un clic dans l'avis. */
const PRESETS = [
  "Surapprentissage probable : trop de paramètres pour la période testée.",
  "Pas assez de trades pour conclure.",
  "Coûts et slippage non pris en compte.",
  "Code incomplet ou impossible à exécuter.",
  "Trop corrélée aux stratégies déjà dans les books.",
  "Doublon d'une proposition existante.",
  "Robuste hors échantillon, coûts inclus.",
];

const AUTO_KEY = "griffin-lab:admin-suivante";
const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const date = (iso: string) => dateFormat.format(new Date(iso));

export function ProposalsInbox({ filter, q, market, markets, counts, items, selected, books, prevId, nextId }: Props) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  // URL d'une sélection en gardant le filtre et la recherche
  const href = useCallback(
    (changes: { statut?: ProposalFilter; id?: string | null }) => {
      const params = new URLSearchParams();
      params.set("statut", changes.statut ?? filter);
      if (q) params.set("q", q);
      if (market) params.set("marche", market);
      const id = changes.id === undefined ? selected?.id : changes.id;
      if (id && !changes.statut) params.set("id", id);
      return `/admin/propositions?${params}`;
    },
    [filter, q, market, selected?.id],
  );

  // J / K ou flèches : proposition suivante / précédente ; « / » : recherche
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      const key = event.key.toLowerCase();
      if ((key === "j" || key === "arrowdown") && (nextId || (!selected && items[0]))) {
        event.preventDefault();
        router.push(href({ id: nextId ?? items[0].id }), { scroll: false });
      } else if ((key === "k" || key === "arrowup") && prevId) {
        event.preventDefault();
        router.push(href({ id: prevId }), { scroll: false });
      } else if (key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [href, items, nextId, prevId, router, selected]);

  return (
    <div className={`${styles.inbox} ${selected ? styles.hasSelection : ""}`}>
      <section className={styles.listPane} aria-label="Liste des propositions">
        <div className={styles.listHead}>
          <div className={styles.titleRow}>
            <Link href="/admin" className={styles.back}>
              ← Administration
            </Link>
            <h1>Propositions</h1>
          </div>
          <nav className={styles.tabs} aria-label="Filtrer par statut">
            {TABS.map((tab) => (
              <Link
                key={tab.id}
                href={href({ statut: tab.id })}
                className={styles.tab}
                aria-current={filter === tab.id ? "page" : undefined}
              >
                {tab.label}
                <span className={`${styles.tabCount} ${tab.id === "unplaced" && counts.unplaced ? styles.alert : ""}`}>
                  {counts[tab.id]}
                </span>
              </Link>
            ))}
          </nav>
          <form className={styles.search} role="search" action="/admin/propositions">
            <input type="hidden" name="statut" value={filter} />
            <input
              ref={searchRef}
              name="q"
              defaultValue={q}
              placeholder="Titre, pseudo, description…  ( / )"
              aria-label="Rechercher une proposition"
            />
            <select
              name="marche"
              defaultValue={market}
              aria-label="Filtrer par marché"
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
            >
              <option value="">Tous les marchés</option>
              {markets.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </form>
        </div>

        {items.length === 0 ? (
          <p className={styles.empty}>
            {q || market ? "Aucune proposition ne correspond." : filter === "pending" ? "Rien en attente. 🎉" : "Aucune proposition."}
          </p>
        ) : (
          <ul className={styles.list}>
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={href({ id: item.id })}
                  scroll={false}
                  className={styles.row}
                  aria-current={selected?.id === item.id ? "true" : undefined}
                >
                  <span className={`${styles.statusDot} ${styles[item.status]}`} aria-hidden="true" />
                  <span className={styles.rowMain}>
                    <b>{item.title}</b>
                    <small>
                      {item.pseudo} · {item.market} · {date(item.createdAt)}
                    </small>
                  </span>
                  <span className={styles.rowSide}>
                    {item.score !== null && <span className={styles.score}>{item.score}</span>}
                    {item.unplaced && <span className={styles.toPlace}>à placer</span>}
                    {item.books.map((color, i) => (
                      <i key={i} className={styles.bookDot} style={{ background: color }} aria-hidden="true" />
                    ))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className={styles.shortcuts}>
          <kbd>J</kbd>/<kbd>K</kbd> naviguer · <kbd>V</kbd> valider · <kbd>T</kbd> test · <kbd>F</kbd> file ·{" "}
          <kbd>R</kbd> refuser
        </p>
      </section>

      <section className={styles.detailPane} aria-label="Proposition choisie">
        {selected ? (
          <Detail key={selected.id} proposal={selected} books={books} nextHref={nextId ? href({ id: nextId }) : null} backHref={href({ id: null })} />
        ) : (
          <div className={styles.placeholder}>
            <b>Choisis une proposition</b>
            <span>
              Ou appuie sur <kbd>J</kbd> pour ouvrir la première de la liste.
            </span>
          </div>
        )}
      </section>
    </div>
  );
}

function Detail({
  proposal,
  books,
  nextHref,
  backHref,
}: {
  proposal: AdminProposal;
  books: { id: string; name: string; color: string }[];
  nextHref: string | null;
  backHref: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [score, setScore] = useState(proposal.score?.toString() ?? "");
  const [reason, setReason] = useState(proposal.reason ?? "");
  const [result, setResult] = useState<AdminResult | null>(null);
  const [auto, setAuto] = useState(true);
  const [copied, setCopied] = useState(false);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      setAuto(localStorage.getItem(AUTO_KEY) !== "0");
    } catch {
      // stockage indisponible
    }
  }, []);

  const run = useCallback(
    (task: () => Promise<AdminResult>, advance = false) =>
      startTransition(async () => {
        const res = await task().catch(() => ({ ok: false, message: "Action impossible. Réessaie." }));
        setResult(res);
        if (res.ok && advance && auto && nextHref) router.push(nextHref, { scroll: false });
        else router.refresh();
      }),
    [auto, nextHref, router],
  );

  const decide = useCallback(
    (status: ProposalStatus) => {
      const value = score.trim() === "" ? null : Number(score);
      if (value !== null && (!Number.isInteger(value) || value < 0 || value > 100)) {
        setResult({ ok: false, message: "Le score est un entier entre 0 et 100." });
        return;
      }
      if (status === "rejected" && !reason.trim()) {
        setResult({ ok: false, message: "Indique la raison du refus : l'auteur la verra." });
        reasonRef.current?.focus();
        return;
      }
      // une proposition validée reste affichée : il reste à la placer dans un book
      run(() => moderateAction(proposal.id, { status, score: value, reason }), status !== "validated");
    },
    [proposal.id, reason, run, score],
  );

  // raccourcis de décision
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (event.metaKey || event.ctrlKey || event.altKey || pending) return;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      const decision = DECISIONS.find((d) => d.key.toLowerCase() === event.key.toLowerCase());
      if (decision) {
        event.preventDefault();
        decide(decision.status);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decide, pending]);

  const placed = new Map(proposal.placements.map((p) => [p.bookId, p]));
  const validated = proposal.status === "validated";

  return (
    <div className={styles.detail} aria-busy={pending}>
      <Link href={backHref} className={styles.mobileBack} scroll={false}>
        ← Liste
      </Link>

      <header className={styles.detailHead}>
        <div className={styles.detailBadges}>
          <StatusPill status={proposal.status} />
          <span className={styles.chip}>{typeLabels[proposal.type]}</span>
          <span className={styles.chip}>{proposal.market}</span>
          {proposal.author.banned && <span className={`${styles.chip} ${styles.chipRed}`}>auteur banni</span>}
        </div>
        <h2>{proposal.title}</h2>
        <p className={styles.detailMeta}>
          {proposal.author.href ? <Link href={proposal.author.href}>{proposal.author.pseudo}</Link> : proposal.author.pseudo}
          {proposal.pseudo !== proposal.author.pseudo && <> (signée « {proposal.pseudo} »)</>} · déposée le{" "}
          {date(proposal.createdAt)}
          {proposal.updatedAt !== proposal.createdAt && <> · modifiée le {date(proposal.updatedAt)}</>}
        </p>
      </header>

      <div className={styles.block}>
        <h3>Description</h3>
        <p className={styles.text}>{proposal.description}</p>
      </div>

      {proposal.paper && (
        <div className={styles.block}>
          <h3>Papier</h3>
          <p className={styles.text}>
            {proposal.paper.url ? (
              <a href={proposal.paper.url} target="_blank" rel="noopener noreferrer nofollow">
                {proposal.paper.title || proposal.paper.url}
              </a>
            ) : (
              proposal.paper.title
            )}
            {proposal.paper.authors && <small> · {proposal.paper.authors}</small>}
          </p>
        </div>
      )}

      {proposal.code && (
        <div className={styles.block}>
          <div className={styles.blockHead}>
            <h3>Code · {proposal.code.split("\n").length} lignes</h3>
            <button
              type="button"
              className={styles.small}
              onClick={() =>
                navigator.clipboard
                  .writeText(proposal.code ?? "")
                  .then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  })
                  .catch(() => undefined)
              }
            >
              {copied ? "Copié" : "Copier"}
            </button>
          </div>
          <pre className={styles.code}>
            <code>{proposal.code}</code>
          </pre>
        </div>
      )}

      {/* Décision */}
      <div className={`${styles.block} ${styles.card}`}>
        <h3>Décision</h3>
        <div className={styles.decisionFields}>
          <label className={styles.field}>
            <span>Score</span>
            <input
              inputMode="numeric"
              value={score}
              onChange={(e) => setScore(e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
              placeholder="0-100"
            />
          </label>
          <label className={`${styles.field} ${styles.grow}`}>
            <span>Avis du script de test (visible par l&apos;auteur)</span>
            <textarea
              ref={reasonRef}
              value={reason}
              maxLength={300}
              rows={2}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Pourquoi elle est validée ou refusée…"
            />
            <small>{reason.length} / 300</small>
          </label>
        </div>
        <div className={styles.presets} aria-label="Raisons fréquentes">
          {PRESETS.map((preset) => (
            <button key={preset} type="button" onClick={() => setReason(preset)} className={styles.preset}>
              {preset}
            </button>
          ))}
        </div>
        <div className={styles.decisions}>
          {DECISIONS.map((d) => (
            <button
              key={d.status}
              type="button"
              disabled={pending}
              onClick={() => decide(d.status)}
              className={`${styles.decision} ${styles[d.tone]} ${proposal.status === d.status ? styles.current : ""}`}
            >
              {d.label}
              <kbd>{d.key}</kbd>
            </button>
          ))}
        </div>
        <label className={styles.auto}>
          <input
            type="checkbox"
            checked={auto}
            onChange={(e) => {
              setAuto(e.target.checked);
              try {
                localStorage.setItem(AUTO_KEY, e.target.checked ? "1" : "0");
              } catch {
                // stockage indisponible
              }
            }}
          />
          Passer à la suivante après une décision (sauf « Valider » : il reste à placer la stratégie)
        </label>
        {result && (
          <p className={result.ok ? styles.ok : styles.error} role="status">
            {result.message}
          </p>
        )}
      </div>

      {/* Books */}
      <div className={`${styles.block} ${styles.card}`}>
        <div className={styles.blockHead}>
          <h3>Books</h3>
          {validated && !proposal.placements.some((b) => b.linked) && <span className={styles.toPlace}>à placer</span>}
        </div>
        {!validated && proposal.placements.length === 0 ? (
          <p className={styles.hint}>Valide la proposition pour placer son auteur dans un book.</p>
        ) : (
          <p className={styles.hint}>
            Ajouter l&apos;auteur à un book lui donne accès à son contenu et y dépose cette stratégie (fiche, code,
            avis). Le retirer supprime sa fiche dans ce book.
          </p>
        )}
        <ul className={styles.books}>
          {books.map((book) => {
            const inBook = placed.get(book.id);
            return (
              <li key={book.id} className={inBook ? styles.inBook : undefined}>
                <i style={{ background: book.color }} aria-hidden="true" />
                <span className={styles.bookName}>
                  {book.name}
                  {inBook && <small>{inBook.linked ? "fiche liée à cette proposition" : "déjà membre (autre fiche)"}</small>}
                </span>
                {inBook ? (
                  <button
                    type="button"
                    className={styles.small}
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm(`Retirer ${proposal.author.pseudo} de ${book.name} ? Sa fiche et ses fichiers dans ce book seront supprimés.`)) {
                        run(() => removeFromBookAction(proposal.id, book.id));
                      }
                    }}
                  >
                    Retirer
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`${styles.small} ${styles.smallPrimary}`}
                    disabled={pending || !validated}
                    onClick={() => run(() => placeInBookAction(proposal.id, book.id))}
                  >
                    Ajouter
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {validated && proposal.placements.some((b) => b.linked) && nextHref && (
          <Link href={nextHref} scroll={false} className={styles.nextLink}>
            Proposition suivante →
          </Link>
        )}
      </div>

      <button
        type="button"
        className={styles.delete}
        disabled={pending}
        onClick={() => {
          if (window.confirm(`Supprimer définitivement « ${proposal.title} » ?`)) {
            run(() => deleteProposalAdminAction(proposal.id), true);
          }
        }}
      >
        Supprimer la proposition
      </button>
    </div>
  );
}
