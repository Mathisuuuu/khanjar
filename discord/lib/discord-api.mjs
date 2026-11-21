/**
 * Outils communs au bot et aux scripts Discord de Griffin Lab : jeton, appels à
 * l'API Discord (avec reprise sur limitation de débit) et adresses du site.
 *
 * Aucune dépendance : seulement Node 22 (fetch, WebSocket).
 */

import { existsSync, readFileSync } from "node:fs";

export const API = "https://discord.com/api/v10";

/** Adresse publique du site (citée dans les messages). */
export const SITE_URL = (process.env.AUTH_URL ?? "https://57.129.191.2").replace(/\/$/, "");
/** Adresse interne du site (même machine), pour lire ses chiffres. */
export const SITE_API = (process.env.SITE_INTERNAL_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");

/**
 * Jeton du bot : variable DISCORD_BOT_TOKEN, sinon fichier discord/.discord-token
 * (ignoré par git, pratique en local). Jamais en argument : il resterait dans
 * l'historique du terminal. Quitte avec le code 2 s'il manque (systemd ne relance pas).
 */
export function loadToken() {
  const file = new URL("../.discord-token", import.meta.url);
  const token =
    process.env.DISCORD_BOT_TOKEN?.trim() ||
    (existsSync(file) ? readFileSync(file, "utf8").replace(/^﻿/, "").trim() : "");
  if (!token) {
    console.error("Jeton manquant : DISCORD_BOT_TOKEN ou fichier discord/.discord-token.");
    process.exit(2);
  }
  return token;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Renvoie `api(method, path, body)` pour appeler l'API Discord avec ce jeton. */
export function createApi(token, agent = "griffin-lab") {
  return async function api(method, path, body) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await fetch(`${API}${path}`, {
        method,
        headers: {
          Authorization: `Bot ${token}`,
          "Content-Type": "application/json",
          "User-Agent": `DiscordBot (${agent}, 1.0)`,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15000),
      });
      if (res.status === 429) {
        const wait = Number((await res.json().catch(() => ({}))).retry_after ?? 1);
        await sleep(Math.ceil(wait * 1000) + 100);
        continue;
      }
      if (res.status === 204) return null;
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const detail = data?.message ?? res.statusText;
        if (res.status === 401) throw new Error("Jeton refusé par Discord (401). Vérifie DISCORD_BOT_TOKEN.");
        if (res.status === 403) throw new Error(`Accès refusé (403) sur ${method} ${path} : ${detail}. Vérifie les droits et la position du rôle du bot.`);
        throw new Error(`${method} ${path} : ${res.status} ${detail}`);
      }
      return data;
    }
    throw new Error(`${method} ${path} : trop de limitations de débit, réessaie plus tard.`);
  };
}

/** Salon texte nommé `name` dans une liste de salons. */
export const textChannel = (channels, name) => channels.find((c) => c.type === 0 && c.name === name);

/** Lit une route JSON du site (adresse interne). */
export async function fetchSite(path) {
  const res = await fetch(`${SITE_API}${path}`, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`site ${path} : ${res.status}`);
  return res.json();
}
