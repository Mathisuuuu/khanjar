import Link from "next/link";
import type { ReactNode } from "react";
import { getT } from "@/lib/i18n/server";
import styles from "./PageHeader.module.css";

type PageHeaderProps = {
  crumb: string;
  title: string;
  children?: ReactNode;
};

/** En-tête des pages secondaires : fil d'Ariane, titre et chapeau. */
export async function PageHeader({ crumb, title, children }: PageHeaderProps) {
  const t = await getT();
  return (
    <div className={`container ${styles.header}`}>
      <nav className={styles.crumb} aria-label={t("Fil d'Ariane", "Breadcrumb")}>
        <Link href="/">{t("Accueil", "Home")}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{crumb}</span>
      </nav>
      <h1 className={styles.title}>{title}</h1>
      {children && <p className={styles.lead}>{children}</p>}
    </div>
  );
}
