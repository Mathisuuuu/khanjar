import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./PageHeader.module.css";

type PageHeaderProps = {
  crumb: string;
  title: string;
  children?: ReactNode;
};

/** En-tête des pages secondaires : fil d'Ariane, titre et chapeau. */
export function PageHeader({ crumb, title, children }: PageHeaderProps) {
  return (
    <div className={`container ${styles.header}`}>
      <nav className={styles.crumb} aria-label="Fil d'Ariane">
        <Link href="/">Accueil</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{crumb}</span>
      </nav>
      <h1 className={styles.title}>{title}</h1>
      {children && <p className={styles.lead}>{children}</p>}
    </div>
  );
}
