/** Informations générales du site et navigation. */
import type { T } from "@/lib/i18n/core";

export const site = {
  name: "Griffin Lab",
  /** Lien d'invitation au serveur Discord (NEXT_PUBLIC_DISCORD_URL dans .env.local). */
  discordUrl: process.env.NEXT_PUBLIC_DISCORD_URL ?? "https://discord.com",
} as const;

export const siteText = (t: T) => ({
  tagline: t("Le bot de trading construit par sa communauté.", "The trading bot built by its community."),
  description: t(
    "Griffin Lab, le bot de trading algorithmique construit par sa communauté. Propose une idée, un script ou un papier SSRN : si elle passe le script de test, tu débloques 100 % du bot.",
    "Griffin Lab, the algorithmic trading bot built by its community. Submit an idea, a script or an SSRN paper: if it passes the test script, you unlock 100% of the bot.",
  ),
  disclaimer: t(
    "Les chiffres présentés sur ce site sont des exemples issus de simulations. Les performances passées ou simulées ne préjugent pas des résultats futurs. Le trading comporte un risque de perte en capital. Ce site ne constitue pas un conseil en investissement.",
    "The figures shown on this site are examples from simulations. Past or simulated performance does not guarantee future results. Trading involves a risk of capital loss. This site is not investment advice.",
  ),
});

export type NavLink = { href: string; label: string };

export const mainNav = (t: T): NavLink[] => [
  { href: "/#concept", label: t("Concept", "Concept") },
  { href: "/recherches", label: t("Recherches", "Research") },
  { href: "/books", label: "Books" },
  { href: "/a-propos", label: t("À propos", "About") },
];

export const footerNav = (t: T): NavLink[] => [
  { href: "/", label: t("Accueil", "Home") },
  { href: "/proposer", label: t("Proposer", "Submit") },
  { href: "/recherches", label: t("Recherches", "Research") },
  { href: "/books", label: "Books" },
  { href: "/a-propos#qui-sommes-nous", label: t("Qui nous sommes", "Who we are") },
  { href: "/a-propos#regles", label: t("Règles", "Rules") },
  { href: "/#test", label: t("Script de test", "Test script") },
  { href: "/connexion", label: t("Connexion", "Sign in") },
];
