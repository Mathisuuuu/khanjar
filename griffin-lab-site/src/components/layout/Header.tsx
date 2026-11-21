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
  // menu des petits écrans (téléphone, tablette) : fermé à chaque changement de page
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

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

          <button
            type="button"
            className={`glass ${styles.round} ${styles.menuButton}`}
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={menuOpen}
            aria-controls="menu-mobile"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav id="menu-mobile" aria-label="Menu" className={styles.mobileMenu}>
          <ul className="container">
            {mainNav.map((link) => (
              <li key={link.href}>
                <Link href={link.href} aria-current={pathname === link.href ? "page" : undefined}>
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              {user ? (
                <Link href="/compte" aria-current={pathname === "/compte" ? "page" : undefined}>
                  Mon compte
                </Link>
              ) : (
                <Link href="/connexion">Se connecter</Link>
              )}
            </li>
            <li>
              <a href={site.discordUrl} target="_blank" rel="noopener noreferrer">
                Discord
              </a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
