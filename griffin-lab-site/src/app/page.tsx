import type { Metadata } from "next";
import { Concept } from "@/components/home/Concept";
import { site } from "@/content/site";
import { Diversification } from "@/components/home/Diversification";
import { FinalCta } from "@/components/home/FinalCta";
import { Hero } from "@/components/home/Hero";
import { Journey } from "@/components/home/Journey";
import { Loops } from "@/components/home/Loops";
import { TestScript } from "@/components/home/TestScript";

// les chiffres des books viennent de la base : la page est régénérée au plus toutes les 5 minutes
// (et tout de suite quand l'équipe les modifie sur /books)
export const revalidate = 300;

// adresse officielle de l'accueil (évite les doublons ?ref=… dans Google), et lien direct dans l'aperçu
export const metadata: Metadata = { alternates: { canonical: "/" } };

const SITE = (process.env.AUTH_URL ?? "https://fleija.live").replace(/\/$/, "");

/**
 * Données structurées pour Google : le nom du site (« Fleija », affiché au-dessus
 * du résultat), son logo et son serveur Discord. Contenu fixe, sans saisie d'utilisateur.
 */
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE}/#website`,
      name: site.name,
      alternateName: ["fleija.live", "Fleija trading"],
      url: `${SITE}/`,
      inLanguage: ["fr", "en"],
      publisher: { "@id": `${SITE}/#organization` },
    },
    {
      "@type": "Organization",
      "@id": `${SITE}/#organization`,
      name: site.name,
      url: `${SITE}/`,
      logo: `${SITE}/apple-icon.png`,
      sameAs: [site.discordUrl],
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD fixe ; « < » échappé par précaution
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA).replace(/</g, "\\u003c") }}
      />
      <Hero />
      <div className="divider" />
      <Concept />
      <Journey />
      <TestScript />
      <Loops />
      <Diversification />
      <FinalCta />
    </>
  );
}
