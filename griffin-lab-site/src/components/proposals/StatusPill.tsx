import { statusLabels, type ProposalStatus } from "@/lib/proposals/types";
import styles from "./StatusPill.module.css";

export function StatusPill({ status }: { status: ProposalStatus }) {
  return <span className={`${styles.pill} ${styles[status]}`}>{statusLabels[status].toUpperCase()}</span>;
}
