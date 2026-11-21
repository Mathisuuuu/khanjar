import type { Metadata, Viewport } from "next";
import { auth } from "@/auth";
import { Inter, JetBrains_Mono, Newsreader } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { GlassPointer } from "@/components/ui/GlassPointer";
import { MascotSprite } from "@/components/ui/Mascot";
import { site, siteText } from "@/content/site";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { getLocale, getT } from "@/lib/i18n/server";
import { getViewer } from "@/lib/auth/viewer";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
// titres des publications de recherche (façon article)
const serif = Newsreader({ subsets: ["latin"], variable: "--font-serif", display: "swap", style: ["normal", "italic"] });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { default: site.name, template: `%s · ${site.name}` },
    description: siteText(t).description,
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
          <MascotSprite />
          <GlassPointer />
          <Header user={user} />
          <main id="main">{children}</main>
          <Footer />
        </LocaleProvider>
      </body>
    </html>
  );
}
