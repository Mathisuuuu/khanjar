"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BookCanvas } from "@/components/books/BookCanvas";
import { useLocale, useT } from "@/components/i18n/LocaleProvider";
import { positiveStreak } from "@/lib/dashboard/metrics";
import { CalendarTile } from "./CalendarTile";
import { ChartsTile } from "./ChartsTile";
import { Overview } from "./Overview";
import { StrategiesTile } from "./StrategiesTile";
import styles from "./Dashboard.module.css";
import type { DashboardBook, DashboardTab } from "./types";

const VIEWS = ["overview", "calendar", "analytics", "members"] as const;
type View = (typeof VIEWS)[number];

type Props = { tabs: DashboardTab[]; book: DashboardBook };

/**
 * Dashboard d'un book : les books à gauche, des onglets en haut (vue d'ensemble,
 * calendrier, analyses, stratégies, membres). Tout tient dans l'écran ; l'onglet
 * ouvert est gardé dans l'adresse (#calendrier…).
 */
export function Dashboard({ tabs, book }: Props) {
  const t = useT();
  const locale = useLocale();
  const [view, setView] = useState<View>("overview");
  // colonne des books repliée ou non (retenue sur cet appareil)
  const [folded, setFolded] = useState(false);
  useEffect(() => {
    try {
      setFolded(window.localStorage.getItem("dashboard-side") === "folded");
    } catch {}
  }, []);
  const fold = () => {
    setFolded((was) => {
      try {
        window.localStorage.setItem("dashboard-side", was ? "open" : "folded");
      } catch {}
      return !was;
    });
  };

  const names: Record<View, { label: string; hash: string; icon: ReactNode }> = {
    overview: { label: t("Vue d'ensemble", "Overview"), hash: "", icon: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" /> },
    calendar: { label: t("Calendrier", "Calendar"), hash: t("calendrier", "calendar"), icon: <path d="M4 6h16v14H4zM4 10h16M9 3v4M15 3v4" /> },
    analytics: { label: t("Analyses", "Analytics"), hash: t("analyses", "analytics"), icon: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /> },
    members: {
      label: t("Membres et stratégies", "Members & strategies"),
      hash: t("membres", "members"),
      icon: <path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM22 19v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8" />,
    },
  };

  // onglet ouvert depuis l'adresse (#analyses…)
  useEffect(() => {
    const fromHash = () => {
      // un « % » mal formé dans l'adresse ne doit pas faire planter la page
      let hash = "";
      try {
        hash = decodeURIComponent(window.location.hash.slice(1));
      } catch {}
      // l'ancien onglet « Stratégies » (#strategies) ouvre l'onglet fusionné
      const found = VIEWS.find((v) => hash && (names[v].hash === hash || v === hash));
      setView(found ?? (hash === "strategies" ? "members" : "overview"));
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const open = (next: View) => {
    setView(next);
    const hash = names[next].hash;
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${hash ? `#${hash}` : ""}`);
  };

  const streak = useMemo(() => positiveStreak(book.days.filter((d) => !d.partial).map((d) => d.value)), [book.days]);
  const bookHref = book.example ? null : `/books/${book.id}`;
  const hash = names[view].hash ? `#${names[view].hash}` : "";

  return (
    <div className={`${styles.page} ${folded ? styles.folded : ""}`}>
      <aside className={styles.side} aria-label={t("Vos books", "Your books")}>
        <div className={styles.sideHead}>
          <p className={styles.sideTitle}>{t("Vos books", "Your books")}</p>
          <button
            type="button"
            className={styles.foldButton}
            onClick={fold}
            aria-expanded={!folded}
            aria-label={folded ? t("Déplier la colonne des books", "Expand the books column") : t("Replier la colonne des books", "Collapse the books column")}
            title={folded ? t("Déplier", "Expand") : t("Replier", "Collapse")}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 5h16v14H4zM9 5v14" />
                <path d={folded ? "M13 10l2 2-2 2" : "M16 10l-2 2 2 2"} />
              </g>
            </svg>
          </button>
        </div>
        <nav>
          <ul className={styles.bookList}>
            {tabs.map((tab) => (
              <li key={tab.id}>
                <Link
                  href={`/dashboards?book=${tab.id}${hash}`}
                  className={styles.bookItem}
                  aria-current={tab.id === book.id ? "page" : undefined}
                  scroll={false}
                  title={folded ? (tab.example ? t("Book d'exemple", "Example book") : tab.name) : undefined}
                >
                  <i style={{ background: tab.color }} aria-hidden="true" />
                  <span className={styles.bookName}>
                    <span>{tab.example ? t("Book d'exemple", "Example book") : tab.name}</span>
                    {tab.example && <em className={styles.badge}>{t("Démo", "Demo")}</em>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.sideFoot}>
          <Link href="/submit">{t("Proposer une stratégie", "Submit a strategy")}</Link>
          <Link href="/books">{t("Tous les books", "All books")}</Link>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.head}>
          <nav className={styles.viewTabs} aria-label={t("Onglets du dashboard", "Dashboard tabs")}>
            {VIEWS.map((v) => (
              <button key={v} type="button" aria-current={view === v ? "page" : undefined} onClick={() => open(v)}>
                <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                  <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {names[v].icon}
                  </g>
                </svg>
                {names[v].label}
              </button>
            ))}
          </nav>
          {streak > 0 && (
            <span className={styles.streak} title={t("Jours positifs d'affilée", "Positive days in a row")}>
              <b>{streak}</b> {streak > 1 ? t("jours positifs d'affilée", "positive days in a row") : t("jour positif", "positive day")}{" "}
              <span aria-hidden="true">🔥</span>
            </span>
          )}
        </header>

        <div className={styles.content}>
          {view === "overview" && <Overview key={book.id} book={book} />}
          {view === "calendar" && (
            <Panel>
              <CalendarTile key={book.id} days={book.days} />
            </Panel>
          )}
          {view === "analytics" && (
            <Panel>
              <ChartsTile key={book.id} days={book.days} color={book.color} expanded />
            </Panel>
          )}
          {view === "members" && (
            <div className={styles.membersView}>
              <Panel flush>
                <BookCanvas
                  key={book.id}
                  name={book.name}
                  color={book.color}
                  members={book.members}
                  groups={book.groups}
                  links={book.links}
                  showResearch={book.groups.length > 0}
                  stats={book.stats}
                />
              </Panel>
              <Panel>
                <StrategiesTile strategies={book.strategies} hidden={book.hiddenStrategies} bookHref={bookHref} />
              </Panel>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Panel({ children, flush = false }: { children: ReactNode; flush?: boolean }) {
  return <section className={`${styles.panel} ${flush ? styles.flush : ""}`}>{children}</section>;
}
