"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandIcon } from "@/components/ui/BrandIcon";
import { Button } from "@/components/ui/Button";
import { Mascot } from "@/components/ui/Mascot";
import { mainNav, site } from "@/content/site";
import styles from "./Header.module.css";

/** Lien « Proposer » quand on n'est pas connecté. */
const PROPOSE_SIGN_IN = `/connexion?callbackUrl=${encodeURIComponent("/proposer")}`;

/** Utilisateur connecté (lu par le layout côté serveur), ou `null`. */
type HeaderUser = { name?: string | null; email?: string | null; image?: string | null } | null;

export function Header({ user }: { user: HeaderUser }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ""}`}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.logo} aria-label="Griffin Lab, accueil">
          <Mascot width={18} />
          GRIFFIN<span className={styles.dot}>·</span>LAB
        </Link>

        <nav aria-label="Navigation principale" className={styles.nav}>
          <ul className={styles.links}>
            {mainNav.map((link) => (
              <li key={link.href}>
                <Link href={link.href} aria-current={pathname === link.href ? "page" : undefined}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.actions}>
          {/* rond « liquid glass » pour mettre le Discord en avant */}
          <a
            href={site.discordUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`glass ${styles.round} ${styles.discord}`}
            aria-label="Rejoindre le Discord Griffin Lab"
            title="Rejoindre le Discord"
          >
            <BrandIcon name="discord" size={20} />
          </a>

          {user && (
            <Link href="/compte" className={`glass ${styles.round} ${styles.avatar}`} aria-label="Mon compte" title="Mon compte">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt="" />
              ) : (
                (user.name || user.email || "?").charAt(0).toUpperCase()
              )}
            </Link>
          )}

          {/* déconnecté : « Proposer » passe d'abord par la connexion, puis revient sur /proposer */}
          <Button href={user ? "/proposer" : PROPOSE_SIGN_IN} variant="glass" className={styles.cta}>
            Proposer
          </Button>
        </div>
      </div>
    </header>
  );
}
