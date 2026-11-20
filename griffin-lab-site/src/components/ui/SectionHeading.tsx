import type { ReactNode } from "react";
import styles from "./SectionHeading.module.css";

type SectionHeadingProps = {
  kicker: string;
  title: ReactNode;
  children?: ReactNode;
  align?: "left" | "center";
  compact?: boolean;
};

/** En-tête de section : sur-titre numéroté, titre et chapeau. */
export function SectionHeading({ kicker, title, children, align = "left", compact = false }: SectionHeadingProps) {
  const cls = [styles.heading, align === "center" ? styles.center : "", compact ? styles.compact : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls}>
      <p className={styles.kicker}>{kicker}</p>
      <h2 className={styles.title}>{title}</h2>
      {children && <p className={styles.lead}>{children}</p>}
    </div>
  );
}
