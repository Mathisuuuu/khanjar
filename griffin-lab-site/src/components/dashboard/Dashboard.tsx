"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { BookCanvas } from "@/components/books/BookCanvas";
import { useLocale, useT } from "@/components/i18n/LocaleProvider";
import { formatNumber, formatPercent } from "@/lib/shared/format";
import { CalendarTile } from "./CalendarTile";
import { ChartsTile } from "./ChartsTile";
import { StrategiesTile } from "./StrategiesTile";
import styles from "./Dashboard.module.css";
import type { DashboardBook, DashboardTab } from "./types";

const VIEWS = ["calendar", "strategies", "charts", "members"] as const;
type View = (typeof VIEWS)[number];

type Props = { tabs: DashboardTab[]; book: DashboardBook; signedIn: boolean; hasBooks: boolean };

/**
 * Dashboard d'un book : une mosaïque de 4 tuiles (calendrier, stratégies,
 * graphes, membres). Chaque tuile s'agrandit en plein écran (#calendrier…),
 * Échap revient à la mosaïque.
 */
export function Dashboard({ tabs, book, signedIn, hasBooks }: Props) {
  const t = useT();
  const locale = useLocale();
  const [view, setView] = useState<View | null>(null);
  const pct = (v: number, d = 1) => formatPercent(v, d, true, locale);

  const names: Record<View, { title: string; hash: string }> = {
    calendar: { title: t("Calendrier", "Calendar"), hash: t("calendrier", "calendar") },
    strategies: { title: t("Stratégies", "Strategies"), hash: t("strategies", "strategies") },
    charts: { title: t("Graphes", "Charts"), hash: t("graphes", "charts") },
    members: { title: t("Membres", "Members"), hash: t("membres", "members") },
  };

  // vue ouverte depuis l'adresse (#graphes…), et retour à la mosaïque avec Échap
  useEffect(() => {
    const fromHash = () => {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      const found = VIEWS.find((v) => names[v].hash === hash || v === hash);
      setView(found ?? null);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);
  useEffect(() => {
    if (!view) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !(event.target instanceof HTMLElement && event.target.closest("svg"))) open(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const open = (next: View | null) => {
    setView(next);
    const url = `${window.location.pathname}${window.location.search}${next ? `#${names[next].hash}` : ""}`;
    window.history.replaceState(null, "", url);
    if (next) document.getElementById("dashboard-grid")?.scrollIntoView({ block: "start" });
  };

  const stats = book.stats;
  const bookHref = book.example ? null : `/books/${book.id}`;
  const visibleStrategies = book.strategies.length + book.hiddenStrategies;

  const tiles: { id: View; subtitle?: string; body: ReactNode; flush?: boolean }[] = [
    {
      id: "calendar",
      subtitle: t("Le rendement du book, jour par jour", "The book's return, day by day"),
      body: <CalendarTile key={book.id} days={book.days} />,
    },
    {
      id: "strategies",
      subtitle:
        visibleStrategies > 1
          ? t(`${visibleStrategies} stratégies dans ce book`, `${visibleStrategies} strategies in this book`)
          : t("Les stratégies de ce book", "This book's strategies"),
      body: <StrategiesTile strategies={book.strategies} hidden={book.hiddenStrategies} bookHref={bookHref} />,
    },
    {
      id: "charts",
      body: <ChartsTile key={book.id} days={book.days} color={book.color} expanded={view === "charts"} />,
    },
    {
      id: "members",
      flush: true,
      body: (
        <BookCanvas
          key={`${book.id}-${view === "members" ? "big" : "small"}`}
          name={book.name}
          color={book.color}
          members={book.members}
          groups={book.groups}
          links={book.links}
          showResearch={book.groups.length > 0}
          stats={stats}
          wheel={view === "members" ? "zoom" : "ctrl"}
        />
      ),
    },
  ];

  const summary = stats
    ? [
        { label: t("1 jour", "1 day"), value: pct(stats.dayReturn, 2), tone: stats.dayReturn },
        ...(stats.weekReturn !== undefined ? [{ label: t("7 jours", "7 days"), value: pct(stats.weekReturn), tone: stats.weekReturn }] : []),
        ...(stats.allTime !== null ? [{ label: "All time", value: pct(stats.allTime), tone: stats.allTime }] : []),
        { label: "Sharpe", value: formatNumber(stats.sharpe, 2, locale) },
        { label: t("DD max", "Max DD"), value: pct(stats.maxDrawdown), tone: -1 },
        { label: t("Stratégies", "Strategies"), value: String(stats.strategies) },
        { label: t("Membres", "Members"), value: String(book.members.length) },
      ]
    : [];

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <h1>Dashboards</h1>
        <nav className={styles.tabs} aria-label={t("Choisir un book", "Choose a book")}>
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={`/dashboards?book=${tab.id}${view ? `#${names[view].hash}` : ""}`}
              className={`${styles.tab} ${tab.example ? styles.exampleTab : ""}`}
              aria-current={tab.id === book.id ? "page" : undefined}
              scroll={false}
            >
              <i style={{ background: tab.color }} aria-hidden="true" />
              {tab.name}
            </Link>
          ))}
        </nav>
        {summary.length > 0 && (
          <dl className={styles.summary} aria-label={t(`Chiffres de ${book.name}`, `${book.name} figures`)}>
            {summary.map((s) => (
              <div key={s.label}>
                <dt>{s.label}</dt>
                <dd className={s.tone === undefined ? undefined : s.tone >= 0 ? styles.up : styles.down}>{s.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {bookHref && (
          <Link href={bookHref} className={styles.textLink}>
            {t("Ouvrir le book →", "Open the book →")}
          </Link>
        )}
      </header>

      {book.example && (
        <div className={styles.notice}>
          <p>
            <b>{t("Book d'exemple", "Example book")}</b> ·{" "}
            {hasBooks
              ? t("chiffres, stratégies et membres inventés.", "made-up figures, strategies and members.")
              : t(
                  "tu n'es dans aucun book : chiffres, stratégies et membres inventés pour te montrer le dashboard.",
                  "you're not in a book yet: made-up figures, strategies and members to show you the dashboard.",
                )}
          </p>
          {!hasBooks && (
            <Link href={signedIn ? "/submit" : "/sign-in?callbackUrl=/dashboards"} className={styles.textLink}>
              {signedIn ? t("Proposer une stratégie →", "Submit a strategy →") : t("Se connecter →", "Sign in →")}
            </Link>
          )}
        </div>
      )}

      <div className={`${styles.grid} ${view ? styles.single : ""}`} id="dashboard-grid">
        {tiles.map((tile) =>
          view && view !== tile.id ? null : (
            <section key={tile.id} className={styles.tile} aria-labelledby={`tile-${tile.id}`}>
              <header className={styles.tileHead}>
                <div className={styles.tileTitle}>
                  <h2 id={`tile-${tile.id}`}>{names[tile.id].title}</h2>
                  {tile.subtitle && <p>{tile.subtitle}</p>}
                </div>
                {view ? (
                  <div className={styles.tileNav}>
                    <button
                      type="button"
                      onClick={() => open(VIEWS[(VIEWS.indexOf(tile.id) + VIEWS.length - 1) % VIEWS.length])}
                      aria-label={t("Tuile précédente", "Previous tile")}
                      title={t("Tuile précédente", "Previous tile")}
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() => open(VIEWS[(VIEWS.indexOf(tile.id) + 1) % VIEWS.length])}
                      aria-label={t("Tuile suivante", "Next tile")}
                      title={t("Tuile suivante", "Next tile")}
                    >
                      ›
                    </button>
                    <button type="button" onClick={() => open(null)} className={styles.expand} title={t("Revenir à la mosaïque (Échap)", "Back to the mosaic (Esc)")}>
                      <CollapseIcon />
                      <span>{t("Réduire", "Collapse")}</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => open(tile.id)}
                    className={styles.expand}
                    aria-label={t(`Agrandir : ${names[tile.id].title}`, `Expand: ${names[tile.id].title}`)}
                    title={t("Agrandir", "Expand")}
                  >
                    <ExpandIcon />
                  </button>
                )}
              </header>
              <div className={`${styles.tileBody} ${tile.flush ? styles.flush : ""}`}>{tile.body}</div>
            </section>
          ),
        )}
      </div>

    </div>
  );
}

function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M20 10h-6V4M4 14h6v6M14 10l7-7M10 14l-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}


