import type { Metadata, Viewport } from "next";
import { auth } from "@/auth";
import { Inter, JetBrains_Mono, Newsreader } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { GlassPointer } from "@/components/ui/GlassPointer";
import { MascotSprite } from "@/components/ui/Mascot";
import { site } from "@/content/site";
import { getViewer } from "@/lib/viewer";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
// titres des publications de recherche (façon article)
const serif = Newsreader({ subsets: ["latin"], variable: "--font-serif", display: "swap", style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.description,
};

export const viewport: Viewport = {
  themeColor: "#08090a",
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // lue côté serveur : l'en-tête est à jour dès la redirection qui suit une connexion / déconnexion
  const [session, viewer] = await Promise.all([auth(), getViewer()]);
  const user = session?.user ? { ...session.user, name: viewer?.name ?? session.user.name } : null;

  return (
    <html lang="fr" className={`${inter.variable} ${mono.variable} ${serif.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Aller au contenu
        </a>
        <MascotSprite />
        <GlassPointer />
        <Header user={user} />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
