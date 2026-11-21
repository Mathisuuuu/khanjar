#!/usr/bin/env node
/**
 * Crée ou remet à jour le message « Strategy counter » de #strategy-ideas, sans
 * annonce (le site le met ensuite à jour à chaque changement de statut, voir
 * griffin-lab-site/src/lib/discord/announce.ts). Besoin de DISCORD_BOT_TOKEN.
 *
 *   node discord/tools/counter.mjs
 */

import { createApi, fetchSite, loadToken, SITE_URL, textChannel } from "../lib/discord-api.mjs";

const api = createApi(loadToken(), "griffin-lab-counter");

// mêmes chiffres que l'accueil (chiffres de départ + propositions réelles)
const counts = await fetchSite("/api/strategies/counts");
const field = (name, c) => ({ name, value: `**${c.total}**\n+${c.week} this week`, inline: true });

const counter = {
  title: "📊 Strategy counter",
  color: 0x22c55e,
  description: `Live status of every strategy submitted on Griffin Lab.\nSubmit yours: ${SITE_URL}/submit`,
  fields: [field("⏳ Pending", counts.pending), field("✅ Validated", counts.validated), field("❌ Rejected", counts.rejected)],
  footer: { text: "Updated" },
  timestamp: new Date().toISOString(),
};

const me = await api("GET", "/users/@me");
const [guild] = await api("GET", "/users/@me/guilds");
const channel = textChannel(await api("GET", `/guilds/${guild.id}/channels`), "strategy-ideas");
if (!channel) throw new Error("#strategy-ideas introuvable");
const recent = await api("GET", `/channels/${channel.id}/messages?limit=100`);
const existing = recent.find((m) => m.author?.id === me.id && m.embeds?.[0]?.title === counter.title);
if (existing) {
  await api("PATCH", `/channels/${channel.id}/messages/${existing.id}`, { embeds: [counter] });
  console.log("compteur mis à jour");
} else {
  const posted = await api("POST", `/channels/${channel.id}/messages`, { embeds: [counter] });
  await api("PUT", `/channels/${channel.id}/pins/${posted.id}`).catch(() => console.log("(non épinglé : droit manquant)"));
  console.log("compteur posté");
}
console.log(counter.fields.map((f) => `${f.name} ${f.value.replace(/\n/g, " ")}`).join(" | "));
