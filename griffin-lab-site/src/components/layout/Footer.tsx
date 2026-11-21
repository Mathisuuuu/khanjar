import Link from "next/link";
import { Mascot } from "@/components/ui/Mascot";
import { footerNav } from "@/content/site";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.top}>
          <span className={styles.logo}>
            <Mascot width={14} />
            GRIFFIN<span className={styles.dot}>·</span>LAB
          </span>
          <nav aria-label="Pied de page" className={styles.nav}>
            {footerNav.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
