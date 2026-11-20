import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      /** "credentials", "discord", "google", "apple" ou "github". */
      provider: string;
    } & DefaultSession["user"];
  }
}
