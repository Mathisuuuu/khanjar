import type { MetadataRoute } from "next";

const SITE = (process.env.AUTH_URL ?? "https://fleija.live").replace(/\/$/, "");

/** robots.txt : les pages publiques sont indexables ; comptes, administration et API ne le sont pas. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/admin", "/moderation", "/welcome", "/verify", "/forgot-password", "/api/"],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
