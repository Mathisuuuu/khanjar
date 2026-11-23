import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { Minitel } from "@/components/ui/Minitel";
import { footerNav } from "@/content/site";
import styles from "./Footer.module.css";

export async function Footer() {
  const t = await getT();
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.top}>
          <span className={styles.logo}>
            <Minitel width={16} inline />
            FLEIJA
          </span>
          <nav aria-label={t("Pied de page", "Footer")} className={styles.nav}>
            {footerNav(t).map((link) => (
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
