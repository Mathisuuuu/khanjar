"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import { statusLabel, type ProposalStatus } from "@/lib/proposals/types";
import styles from "./StatusPill.module.css";

export function StatusPill({ status }: { status: ProposalStatus }) {
  const locale = useLocale();
  return <span className={`${styles.pill} ${styles[status]}`}>{statusLabel(status, locale).toUpperCase()}</span>;
}
