/** Informations générales du site et navigation. */
import type { T } from "@/lib/i18n/core";

export const site = {
  name: "Fleija",
  /** Lien d'invitation au serveur Discord (NEXT_PUBLIC_DISCORD_URL dans .env.local). */
  discordUrl: process.env.NEXT_PUBLIC_DISCORD_URL ?? "https://discord.gg/c2e9nSH8pV",
} as const;

export const siteText = (t: T) => ({
  tagline: t("Le bot de trading construit par sa communauté.", "The trading bot built by its community."),
  description: t(
    "Fleija, le bot de trading algorithmique construit par sa communauté. Propose une idée, un script ou un papier SSRN : si elle passe le script de test, elle entre dans un book et tu débloques 100 % de ce book.",
    "Fleija, the algorithmic trading bot built by its community. Submit an idea, a script or an SSRN paper: if it passes the test script, it joins a book and you unlock 100% of that book.",
  ),
  disclaimer: t(
    "Les chiffres présentés sur ce site sont des exemples issus de simulations. Les performances passées ou simulées ne préjugent pas des résultats futurs. Le trading comporte un risque de perte en capital. Ce site ne constitue pas un conseil en investissement.",
    "The figures shown on this site are examples from simulations. Past or simulated performance does not guarantee future results. Trading involves a risk of capital loss. This site is not investment advice.",
  ),
});

export type NavLink = { href: string; label: string };

export const mainNav = (t: T): NavLink[] => [
  { href: "/#concept", label: t("Concept", "Concept") },
  { href: "/research", label: t("Recherches", "Research") },
  { href: "/books", label: "Books" },
  { href: "/dashboards", label: "Dashboards" },
  { href: "/about", label: t("À propos", "About") },
];

export const footerNav = (t: T): NavLink[] => [
  { href: "/", label: t("Accueil", "Home") },
  { href: "/submit", label: t("Proposer", "Submit") },
  { href: "/research", label: t("Recherches", "Research") },
  { href: "/books", label: "Books" },
  { href: "/dashboards", label: "Dashboards" },
  { href: "/about#about-us", label: t("Qui nous sommes", "Who we are") },
  { href: "/about#rules", label: t("Règles", "Rules") },
  { href: "/#test", label: t("Script de test", "Test script") },
  { href: "/privacy", label: t("Confidentialité", "Privacy") },
  { href: "/sign-in", label: t("Connexion", "Sign in") },
];
