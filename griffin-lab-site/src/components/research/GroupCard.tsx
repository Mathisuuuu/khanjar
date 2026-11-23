import Link from "next/link";
import type { GroupRole } from "@/lib/research/access";
import type { GroupSummary } from "@/lib/research/repository";
import { PdfFan } from "./PdfFan";
import { getT } from "@/lib/i18n/server";
import styles from "./Research.module.css";


type GroupCardProps = {
  group: GroupSummary;
  role: GroupRole | null;
  /** Réserve la place des cartes PDF (quand un groupe de la même grille en a). */
  reserveFan?: boolean;
};

/** Carte d'un groupe dans la liste des recherches, avec ses PDF qui en dépassent. */
export async function GroupCard({ group, role, reserveFan }: GroupCardProps) {
  const t = await getT();
  const roleBadges: Record<GroupRole, string> = {
    owner: t("Propriétaire", "Owner"),
    editor: t("Membre", "Member"),
    viewer: t("Lecteur", "Reader"),
  };
  return (
    <div className={styles.cardWrap}>
      {(reserveFan || group.pdfs.length > 0) && (
        <div className={styles.fanArea}>
          {group.pdfs.length > 0 && <PdfFan files={group.pdfs} groupName={group.name} />}
        </div>
      )}
      <Link href={`/research/${group.id}`} className={styles.card}>
        <div className={styles.badges}>
          {group.kind === "official" && <span className={`${styles.badge} ${styles.official}`}>Fleija</span>}
          {group.visibility === "private" && <span className={`${styles.badge} ${styles.private}`}>{t("Privé", "Private")}</span>}
          {role && <span className={`${styles.badge} ${styles.role}`}>{roleBadges[role]}</span>}
        </div>
        <h3>{group.name}</h3>
        {group.description && <p>{group.description}</p>}
        <div className={styles.meta}>
          <span>{t("par", "by")} {group.ownerName}</span>
          <span>
            {group.postCount} {t("publication", "post")}
            {group.postCount > 1 ? "s" : ""}
          </span>
        </div>
      </Link>
    </div>
  );
}
