import Link from "next/link";
import type { GroupRole } from "@/lib/research/access";
import type { GroupSummary } from "@/lib/research/repository";
import { PdfFan } from "./PdfFan";
import styles from "./Research.module.css";

const roleBadges: Record<GroupRole, string> = { owner: "Propriétaire", editor: "Membre", viewer: "Lecteur" };

type GroupCardProps = {
  group: GroupSummary;
  role: GroupRole | null;
  /** Réserve la place des cartes PDF (quand un groupe de la même grille en a). */
  reserveFan?: boolean;
};

/** Carte d'un groupe dans la liste des recherches, avec ses PDF qui en dépassent. */
export function GroupCard({ group, role, reserveFan }: GroupCardProps) {
  return (
    <div className={styles.cardWrap}>
      {(reserveFan || group.pdfs.length > 0) && (
        <div className={styles.fanArea}>
          {group.pdfs.length > 0 && <PdfFan files={group.pdfs} groupName={group.name} />}
        </div>
      )}
      <Link href={`/recherches/${group.id}`} className={styles.card}>
        <div className={styles.badges}>
          {group.kind === "official" && <span className={`${styles.badge} ${styles.official}`}>Griffin Lab</span>}
          {group.visibility === "private" && <span className={`${styles.badge} ${styles.private}`}>Privé</span>}
          {role && <span className={`${styles.badge} ${styles.role}`}>{roleBadges[role]}</span>}
        </div>
        <h3>{group.name}</h3>
        {group.description && <p>{group.description}</p>}
        <div className={styles.meta}>
          <span>par {group.ownerName}</span>
          <span>
            {group.postCount} publication{group.postCount > 1 ? "s" : ""}
          </span>
        </div>
      </Link>
    </div>
  );
}
