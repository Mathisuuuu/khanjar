import type { Metadata, Viewport } from "next";
import { auth } from "@/auth";
import { Inter, JetBrains_Mono, Newsreader } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { GlassPointer } from "@/components/ui/GlassPointer";
import { AnimatedFavicon } from "@/components/layout/AnimatedFavicon";
import { site, siteText } from "@/content/site";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { getLocale, getT } from "@/lib/i18n/server";
import { getViewer } from "@/lib/auth/viewer";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
// titres des publications de recherche (façon article)
// (pas de préchargement : elle ne sert que sur les pages de recherche)
const serif = Newsreader({ subsets: ["latin"], variable: "--font-serif", display: "swap", style: ["normal", "italic"], preload: false });

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const text = siteText(t);
  // « Fleija » en tête du titre : c'est ce que Google affiche et ce que les gens cherchent
  const title = `${site.name} · ${text.tagline.replace(/\.$/, "")}`;
  return {
    metadataBase: new URL(process.env.AUTH_URL ?? "https://fleija.live"),
    title: { default: title, template: `%s · ${site.name}` },
    description: text.description,
    applicationName: site.name,
    keywords: ["Fleija", "bot de trading", "trading algorithmique", "stratégie de trading", "communauté", "trading bot", "SSRN"],
    // aperçu des liens partagés (Discord, WhatsApp, X…) ; l'image vient de app/opengraph-image.tsx
    openGraph: {
      type: "website",
      siteName: site.name,
      title,
      description: text.description,
      locale: locale === "en" ? "en_US" : "fr_FR",
      alternateLocale: locale === "en" ? "fr_FR" : "en_US",
    },
    twitter: { card: "summary_large_image", title, description: text.description },
  };
}

export const viewport: Viewport = {
  themeColor: "#08090a",
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // lue côté serveur : l'en-tête est à jour dès la redirection qui suit une connexion / déconnexion
  const [session, viewer, locale] = await Promise.all([auth(), getViewer(), getLocale()]);
  const user = session?.user && viewer ? { ...session.user, name: viewer.name } : null;

  return (
    <html lang={locale} className={`${inter.variable} ${mono.variable} ${serif.variable}`}>
      <body>
        <LocaleProvider locale={locale}>
          <a href="#main" className="skip-link">
            {locale === "en" ? "Skip to content" : "Aller au contenu"}
          </a>
          <GlassPointer />
          <AnimatedFavicon />
          <Header user={user} />
          <main id="main">{children}</main>
          <Footer />
        </LocaleProvider>
      </body>
    </html>
  );
}
