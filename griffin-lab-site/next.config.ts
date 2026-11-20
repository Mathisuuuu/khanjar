import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Politique de sécurité du contenu : le navigateur ne charge que les
 * ressources du site lui-même (pas de script, image ou iframe venus d'ailleurs).
 * - 'unsafe-inline' (scripts) : petits scripts de démarrage injectés par Next.js ;
 * - 'wasm-unsafe-eval' : décodeurs d'images de pdf.js ;
 * - form-action : retours vers les fournisseurs de connexion OAuth.
 * En développement, Next.js a besoin d'eval : la politique n'est appliquée qu'en production.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self' https://discord.com https://accounts.google.com https://appleid.apple.com https://github.com",
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
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
