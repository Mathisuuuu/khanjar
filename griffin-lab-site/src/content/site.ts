/** Informations générales du site et navigation. */

export const site = {
  name: "Griffin Lab",
  tagline: "Le bot de trading construit par sa communauté.",
  description:
    "Griffin Lab, le bot de trading algorithmique construit par sa communauté. Propose une idée, un script ou un papier SSRN : si elle passe le script de test, tu débloques 100 % du bot.",
  /** Lien d'invitation au serveur Discord (NEXT_PUBLIC_DISCORD_URL dans .env.local). */
  discordUrl: process.env.NEXT_PUBLIC_DISCORD_URL ?? "https://discord.com",
  disclaimer:
    "Les chiffres présentés sur ce site sont des exemples issus de simulations. Les performances passées ou simulées ne préjugent pas des résultats futurs. Le trading comporte un risque de perte en capital. Ce site ne constitue pas un conseil en investissement.",
} as const;

export type NavLink = { href: string; label: string };

export const mainNav: NavLink[] = [
  { href: "/#concept", label: "Concept" },
  { href: "/qui-sommes-nous", label: "Qui nous sommes" },
  { href: "/recherches", label: "Recherches" },
  { href: "/books", label: "Books" },
  { href: "/regles", label: "Règles" },
];

export const footerNav: NavLink[] = [
  { href: "/", label: "Accueil" },
  { href: "/proposer", label: "Proposer" },
  { href: "/recherches", label: "Recherches" },
  { href: "/books", label: "Books" },
  { href: "/qui-sommes-nous", label: "Qui nous sommes" },
  { href: "/regles", label: "Règles" },
  { href: "/#test", label: "Script de test" },
  { href: "/connexion", label: "Connexion" },
];
