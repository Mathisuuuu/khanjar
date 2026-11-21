import NextAuth, { CredentialsSignin, type NextAuthConfig } from "next-auth";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import Discord from "next-auth/providers/discord";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { isBanned } from "@/lib/admin/repository";
import { isProviderConfigured } from "@/lib/auth-providers";
import { clientIp, consume } from "@/lib/rate-limit";
import { burnPasswordCheck, verifyPassword } from "@/lib/users/password";
import { getUserRepository } from "@/lib/users/repository";
import { signInSchema } from "@/lib/users/schema";

/**
 * Authentification (Auth.js v5).
 * - E-mail + mot de passe : comptes de la table `users`, mots de passe hachés (scrypt).
 * - Discord, Google, Apple, GitHub : OAuth, actifs seulement si leurs clés sont définies.
 * Sessions en JWT signé avec AUTH_SECRET, dans un cookie HttpOnly (Secure en HTTPS).
 */

/** Trop de tentatives : le formulaire affiche un message dédié. */
export class TooManyAttempts extends CredentialsSignin {
  code = "rate_limited";
}

/** Bon mot de passe, mais adresse pas encore confirmée : le formulaire propose de renvoyer l'e-mail. */
export class EmailNotVerified extends CredentialsSignin {
  code = "unverified";
}

const FIFTEEN_MINUTES = 15 * 60;

/**
 * L'adresse donnée par un fournisseur OAuth n'est utilisée (invitations aux
 * groupes privés…) que si le fournisseur la déclare vérifiée : sinon, n'importe
 * qui pourrait ouvrir un compte Discord avec l'adresse d'un autre.
 */
async function oauthEmailVerified(provider: string, profile: Record<string, unknown> | undefined, accessToken?: string) {
  if (!profile || typeof profile.email !== "string" || !profile.email) return false;
  if (provider === "discord") return profile.verified === true;
  if (provider === "google" || provider === "apple") return profile.email_verified === true || profile.email_verified === "true";
  if (provider === "github" && accessToken) {
    try {
      const res = await fetch("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "griffin-lab", Accept: "application/vnd.github+json" },
      });
      if (!res.ok) return false;
      const emails = (await res.json()) as { email: string; verified: boolean }[];
      const email = String(profile.email).toLowerCase();
      return emails.some((e) => e.verified && e.email.toLowerCase() === email);
    } catch {
      return false;
    }
  }
  return false;
}

const providers: NextAuthConfig["providers"] = [
  Credentials({
    id: "credentials",
    name: "E-mail",
    credentials: { email: {}, password: {} },
    async authorize(raw, request) {
      const parsed = signInSchema.safeParse(raw);
      if (!parsed.success) return null;
      const { email, password } = parsed.data;

      // contre le devinage de mots de passe : par adresse IP et par compte
      const ip = await clientIp(request?.headers);
      const allowed =
        (await consume(`login:ip:${ip}`, 30, FIFTEEN_MINUTES)) &&
        (await consume(`login:email:${email}`, 10, FIFTEEN_MINUTES));
      if (!allowed) throw new TooManyAttempts();

      const user = await getUserRepository().findByEmail(email);
      if (!user) return burnPasswordCheck(password).then(() => null);
      if (!(await verifyPassword(password, user.passwordHash))) return null;
      if (!user.emailVerifiedAt) throw new EmailNotVerified();
      return { id: user.id, email: user.email, name: user.name };
    },
  }),
];

if (isProviderConfigured("discord")) {
  providers.push(Discord({ clientId: process.env.AUTH_DISCORD_ID, clientSecret: process.env.AUTH_DISCORD_SECRET }));
}
if (isProviderConfigured("google")) {
  providers.push(Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET }));
}
if (isProviderConfigured("apple")) {
  providers.push(Apple({ clientId: process.env.AUTH_APPLE_ID, clientSecret: process.env.AUTH_APPLE_SECRET }));
}
if (isProviderConfigured("github")) {
  providers.push(GitHub({ clientId: process.env.AUTH_GITHUB_ID, clientSecret: process.env.AUTH_GITHUB_SECRET }));
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  // session de 14 jours, prolongée tant que la personne revient sur le site
  session: { strategy: "jwt", maxAge: 14 * 24 * 60 * 60 },
  pages: { signIn: "/connexion" },
  callbacks: {
    // compte banni par un administrateur : connexion refusée, quel que soit le fournisseur
    async signIn({ user, account }) {
      if (!account || !user.id) return true;
      return !(await isBanned(`${account.provider}:${user.id}`));
    },
    async jwt({ token, account, profile }) {
      // à la connexion : fournisseur utilisé (affiché sur /compte), heure de connexion, adresse vérifiée ou non
      if (account) {
        token.provider = account.provider;
        token.authAt = Math.floor(Date.now() / 1000);
        token.emailVerified =
          account.provider === "credentials" ||
          (await oauthEmailVerified(account.provider, profile as Record<string, unknown> | undefined, account.access_token));
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub ?? "";
      session.user.provider = typeof token.provider === "string" ? token.provider : "credentials";
      session.user.authAt = typeof token.authAt === "number" ? token.authAt : 0;
      session.user.emailTrusted = token.emailVerified === true;
      return session;
    },
  },
});
