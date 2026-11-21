#!/usr/bin/env node
/**
 * Bot d'accueil du serveur Discord de Griffin Lab : à chaque arrivée, il donne
 * le rôle « Member » et souhaite la bienvenue dans #general (en anglais).
 *
 * Tourne en continu sur le VPS (service systemd griffin-discord). Aucune
 * dépendance : la passerelle Discord est jointe avec le WebSocket de Node 22.
 * Le jeton est lu dans DISCORD_BOT_TOKEN (fichier /etc/griffin-discord.env).
 * Chaque jour à 8 h UTC, il poste aussi les rendements 30 jours des books dans
 * #books-performance (`node bot.mjs --rendements-maintenant` pour le faire tout de suite).
 *
 * Il faut activer « Server Members Intent » dans le portail développeur
 * (Bot → Privileged Gateway Intents), sinon Discord n'envoie pas les arrivées.
 */

import { createApi, fetchSite, loadToken, SITE_URL, textChannel } from "./lib/discord-api.mjs";

const GATEWAY = "wss://gateway.discord.gg/?v=10&encoding=json";
const INTENTS = (1 << 0) | (1 << 1); // GUILDS, GUILD_MEMBERS
const MEMBER_ROLE = "Member";
const GREET_CHANNEL = "general";

const token = loadToken();
const api = createApi(token, "griffin-lab-bot");
const log = (...args) => console.log(new Date().toISOString(), ...args);

const byName = (list, name) => list.find((x) => x.name.toLowerCase() === name.toLowerCase());

async function welcome(guildId, member) {
  const user = member.user;
  if (!user || user.bot) return;
  const [roles, channels] = await Promise.all([api("GET", `/guilds/${guildId}/roles`), api("GET", `/guilds/${guildId}/channels`)]);

  const role = byName(roles, MEMBER_ROLE);
  if (role) {
    await api("PUT", `/guilds/${guildId}/members/${user.id}/roles/${role.id}`).catch((e) => log("rôle non donné :", e.message));
  }

  const general = textChannel(channels, GREET_CHANNEL);
  if (!general) return log(`#${GREET_CHANNEL} introuvable`);
  const link = (name) => {
    const c = textChannel(channels, name);
    return c ? `<#${c.id}>` : `#${name}`;
  };
  await api("POST", `/channels/${general.id}/messages`, {
    content: `Hey <@${user.id}>, welcome to **Griffin Lab**! 👋`,
    embeds: [
      {
        color: 0x3b82f6,
        description:
          `Glad to have you here. To get started:\n` +
          `• Read the rules in ${link("welcome")}\n` +
          `• Say hi right here\n` +
          `• Got a strategy idea? Talk about it in ${link("strategy-ideas")}`,
      },
    ],
    allowed_mentions: { users: [user.id] },
  });
  log(`bienvenue envoyée (${user.id})`);
}

/* ---------- Rendements quotidiens des books ---------- */

const PERF_CHANNEL = "books-performance";
const PERF_HOUR_UTC = 8; // 9 h à Paris en hiver, 10 h en été
const BOOK_COLORS = { A: "🔵", B: "🟣", C: "🟡" };
const pct = (value) => `${value >= 0 ? "+" : ""}${value.toFixed(2)} %`;

async function postBookReturns() {
  const guilds = await api("GET", "/users/@me/guilds");
  const me = await api("GET", "/users/@me");
  const today = new Date().toISOString().slice(0, 10);
  for (const guild of guilds) {
    const channels = await api("GET", `/guilds/${guild.id}/channels`);
    const channel = textChannel(channels, PERF_CHANNEL);
    if (!channel) continue;
    // déjà posté aujourd'hui (redémarrage du service) : rien à faire
    const recent = await api("GET", `/channels/${channel.id}/messages?limit=10`);
    if (recent.some((m) => m.author?.id === me.id && m.timestamp.slice(0, 10) === today)) continue;

    const books = await fetchSite("/api/books/live");
    if (!Array.isArray(books) || books.length === 0) throw new Error("aucun book renvoyé par le site");
    const best = books.reduce((a, b) => (b.monthReturn > a.monthReturn ? b : a));
    await api("POST", `/channels/${channel.id}/messages`, {
      embeds: [
        {
          title: `📈 Book returns · ${today}`,
          color: 0x22c55e,
          description: "Rolling 30-day returns of each Griffin Lab book.",
          fields: books.map((b) => ({
            name: `${BOOK_COLORS[b.letter] ?? "⚪"} ${b.name}${b === best ? "  🏆" : ""}`,
            value:
              `**30 days: ${pct(b.monthReturn)}**\n` +
              (b.weekReturn != null ? `7 days: ${pct(b.weekReturn)}\n` : "") +
              `Sharpe ${b.sharpe.toFixed(2)} · Max DD ${b.maxDrawdown.toFixed(1)} %\n` +
              `${b.strategies} strategies`,
            inline: true,
          })),
          footer: { text: "Past performance does not guarantee future results. Not financial advice." },
          url: SITE_URL,
          timestamp: new Date().toISOString(),
        },
      ],
      allowed_mentions: { parse: [] },
    });
    log(`rendements postés dans #${PERF_CHANNEL}`);
  }
}

function scheduleBookReturns() {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), PERF_HOUR_UTC));
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  setTimeout(async () => {
    await postBookReturns().catch((e) => log("rendements non postés :", e.message));
    scheduleBookReturns();
  }, next - now);
}

scheduleBookReturns();
if (process.argv.includes("--rendements-maintenant")) {
  postBookReturns().catch((e) => log("rendements non postés :", e.message));
}

/* ---------- Passerelle ---------- */

let attempt = 0;

function connect() {
  const ws = new WebSocket(GATEWAY);
  let heartbeat = null;
  let seq = null;
  let acked = true;

  const send = (op, d) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ op, d }));

  ws.addEventListener("message", (event) => {
    const { op, d, s, t } = JSON.parse(event.data);
    if (s != null) seq = s;
    switch (op) {
      case 10: // Hello
        acked = true;
        heartbeat = setInterval(() => {
          if (!acked) return ws.close(4000, "heartbeat sans réponse");
          acked = false;
          send(1, seq);
        }, d.heartbeat_interval);
        send(2, { token, intents: INTENTS, properties: { os: "linux", browser: "griffin-lab", device: "griffin-lab" } });
        break;
      case 11:
        acked = true;
        break;
      case 1:
        send(1, seq);
        break;
      case 7: // Reconnect demandé
      case 9: // Session invalide
        ws.close(4000, "reconnexion");
        break;
      case 0:
        if (t === "READY") {
          attempt = 0;
          log(`connecté en tant que ${d.user.username} sur ${d.guilds.length} serveur(s)`);
        } else if (t === "GUILD_MEMBER_ADD") {
          welcome(d.guild_id, d).catch((e) => log("erreur d'accueil :", e.message));
        }
        break;
    }
  });

  ws.addEventListener("close", (event) => {
    clearInterval(heartbeat);
    if (event.code === 4004) {
      console.error("Jeton refusé par Discord (4004).");
      process.exit(2);
    }
    if (event.code === 4014) {
      console.error("Intent refusé (4014) : active « Server Members Intent » dans le portail développeur, onglet Bot.");
      process.exit(2);
    }
    const delay = Math.min(60_000, 1000 * 2 ** attempt++);
    log(`déconnecté (${event.code}), nouvelle tentative dans ${delay / 1000} s`);
    setTimeout(connect, delay);
  });

  ws.addEventListener("error", () => {}); // suivi d'un « close »
}

connect();
process.on("SIGTERM", () => process.exit(0));
