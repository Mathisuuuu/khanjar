import type { MetadataRoute } from "next";

const SITE = (process.env.AUTH_URL ?? "https://fleija.live").replace(/\/$/, "");

/** Plan du site pour les moteurs de recherche : les pages publiques principales. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: [path: string, priority: number][] = [
    ["", 1],
    ["/about", 0.8],
    ["/books", 0.8],
    ["/research", 0.7],
    ["/sign-in", 0.5],
    ["/privacy", 0.3],
  ];
  return pages.map(([path, priority]) => ({ url: `${SITE}${path}`, changeFrequency: "weekly", priority }));
}
