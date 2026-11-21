import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Politique de sécurité du contenu : le navigateur ne charge que les
 * ressources du site lui-même (pas de script, image ou iframe venus d'ailleurs).
 * - 'unsafe-inline' (scripts) : petits scripts de démarrage injectés par Next.js ;
 * - 'wasm-unsafe-eval' : décodeurs d'images de pdf.js ;
 * - form-action : retours vers Discord et Google (connexion OAuth).
 * En développement, Next.js a besoin d'eval : la politique n'est appliquée qu'en production.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  // avatars des comptes Discord et Google (page /compte)
  "img-src 'self' data: blob: https://cdn.discordapp.com https://lh3.googleusercontent.com",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self' https://discord.com https://accounts.google.com",
].join("; ");

const securityHeaders = [
  ...(isProd ? [{ key: "Content-Security-Policy", value: contentSecurityPolicy }] : []),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // pilotes de base de données chargés tels quels par Node (pas d'empaquetage)
  serverExternalPackages: ["pg", "@electric-sql/pglite"],
  experimental: {
    // publications de recherche : jusqu'à 5 pièces jointes de 10 Mo
    serverActions: { bodySizeLimit: "52mb" },
  },
  // anciennes adresses françaises (liens partagés, e-mails déjà envoyés) → adresses anglaises
  async redirects() {
    const renamed: [string, string][] = [
      ["/a-propos", "/about"],
      ["/admin/propositions", "/admin/proposals"],
      ["/api/books/fichiers", "/api/books/files"],
      ["/api/recherches/fichiers", "/api/research/files"],
      ["/recherches/nouveau", "/research/new"],
      ["/recherches", "/research"],
      ["/bienvenue", "/welcome"],
      ["/compte", "/account"],
      ["/connexion", "/sign-in"],
      ["/membres", "/members"],
      ["/mot-de-passe-oublie", "/forgot-password"],
      ["/proposer", "/submit"],
      ["/verification", "/verify"],
    ];
    return [
      { source: "/qui-sommes-nous", destination: "/about#about-us", permanent: true },
      { source: "/regles", destination: "/about#rules", permanent: true },
      ...renamed.flatMap(([from, to]) => [
        { source: from, destination: to, permanent: true },
        { source: `${from}/:path*`, destination: `${to}/:path*`, permanent: true },
      ]),
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
