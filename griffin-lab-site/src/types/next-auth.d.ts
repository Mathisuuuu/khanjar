import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      /** "credentials", "discord" ou "google". */
      provider: string;
      /** Heure de connexion (secondes) : une session plus ancienne que le dernier changement de mot de passe est refusée. */
      authAt: number;
      /** Adresse e-mail confirmée (par le site, ou déclarée vérifiée par le fournisseur OAuth). */
      emailTrusted: boolean;
    } & DefaultSession["user"];
  }
}
