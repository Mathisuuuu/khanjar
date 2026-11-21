import "server-only";
import { getStrategyCounts, type StrategyCounts } from "@/lib/proposals/counts";
import { consume } from "@/lib/security/rate-limit";
import type { ProposalStatus } from "@/lib/proposals/types";
import type { ResearchGroup, ResearchPost } from "@/lib/research/types";

/**
 * Annonces sur le serveur Discord de Griffin Lab, envoyées par le bot.
 * Sans DISCORD_BOT_TOKEN (développement), rien n'est envoyé. Une erreur Discord
 * ne fait jamais échouer l'action du site : elle est seulement journalisée.
 */

const API = "https://discord.com/api/v10";
const channelCache = new Map<string, { id: string; at: number }>();

const siteUrl = () => (process.env.AUTH_URL ?? "https://57.129.191.2").replace(/\/$/, "");
const cut = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/**
 * Texte écrit par un membre, affiché par le bot : sans mise en forme Discord
 * (pas de lien masqué « [texte](url) », de spoiler, de titre…) et sans lien
 * cliquable ni mention, pour que personne ne publie un lien piégé sous le nom
 * du bot. Les caractères invisibles et de contrôle sont retirés.
 */
export function plain(text: string, max: number): string {
  const clean = text
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f​-‏‪-‮⁠-⁤﻿]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cut(clean, max)
    .replace(/[\\`*_~|>#[\]()<@:-]/g, (c) => (c === ":" ? ":​" : `\\${c}`)) // « https:// » n'est plus un lien
    .replace(/\./g, ".​"); // « discord.gg/… » non plus
}

async function discord(method: string, path: string, body?: unknown) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "DiscordBot (griffin-lab-site, 1.0)",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`${method} ${path} : ${res.status}`);
  return res.status === 204 ? null : res.json();
}

/** Identifiant d'un salon textuel du serveur, retrouvé par son nom (gardé une heure). */
async function channelId(name: string): Promise<string | null> {
  const cached = channelCache.get(name);
  if (cached && Date.now() - cached.at < 3600_000) return cached.id;
  const guilds = (await discord("GET", "/users/@me/guilds")) as { id: string }[];
  for (const guild of guilds) {
    const channels = (await discord("GET", `/guilds/${guild.id}/channels`)) as { id: string; name: string; type: number }[];
    const found = channels.find((c) => c.type === 0 && c.name === name);
    if (found) {
      channelCache.set(name, { id: found.id, at: Date.now() });
      return found.id;
    }
  }
  return null;
}

/* ---------- Propositions de stratégies ---------- */

const STRATEGY_CHANNEL = "strategy-ideas";
const COUNTER_TITLE = "📊 Strategy counter";

const statusEvents: Record<ProposalStatus, { text: string; color: number }> = {
  pending: { text: "🟡 A new strategy joined the queue.", color: 0xf5b524 },
  testing: { text: "🔵 A strategy is now going through the test script.", color: 0x38bdf8 },
  validated: { text: "🟢 A strategy passed every check and was **validated**.", color: 0x22c55e },
  rejected: { text: "🔴 A strategy did not pass the checks and was **rejected**.", color: 0xef4444 },
};

function counterFields(counts: StrategyCounts) {
  const field = (label: string, c: { total: number; week: number }) => ({
    name: label,
    value: `**${c.total}**\n+${c.week} this week`,
    inline: true,
  });
  return [field("⏳ Pending", counts.pending), field("✅ Validated", counts.validated), field("❌ Rejected", counts.rejected)];
}

/**
 * Annonce anonyme dans #strategy-ideas : une stratégie entre en file, passe en
 * test, est validée ou refusée. Ni titre, ni auteur, ni motif. Le message
 * « Strategy counter » du salon est ensuite remis à jour.
 */
export async function announceProposalStatus(status: ProposalStatus): Promise<void> {
  if (!process.env.DISCORD_BOT_TOKEN) return;
  try {
    // contre le spam de propositions (même avec plusieurs comptes) : 30 annonces par heure au plus
    if (!(await consume("discord:proposals", 30, 3600))) return;
    const id = await channelId(STRATEGY_CHANNEL);
    if (!id) return;
    const counts = await getStrategyCounts();
    const event = statusEvents[status];
    await discord("POST", `/channels/${id}/messages`, {
      embeds: [{ description: event.text, color: event.color, fields: counterFields(counts), timestamp: new Date().toISOString() }],
      allowed_mentions: { parse: [] },
    });

    // compteur permanent : le message du bot est modifié au lieu d'être reposté
    const counter = {
      title: COUNTER_TITLE,
      color: 0x22c55e,
      description: `Live status of every strategy submitted on Griffin Lab.\nSubmit yours: ${siteUrl()}/submit`,
      fields: counterFields(counts),
      footer: { text: "Updated" },
      timestamp: new Date().toISOString(),
    };
    const me = (await discord("GET", "/users/@me")) as { id: string };
    const pins = (await discord("GET", `/channels/${id}/pins`)) as DiscordMessage[];
    const recent = (await discord("GET", `/channels/${id}/messages?limit=100`)) as DiscordMessage[];
    const existing = [...pins, ...recent].find((m) => m.author?.id === me.id && m.embeds?.[0]?.title === COUNTER_TITLE);
    if (existing) await discord("PATCH", `/channels/${id}/messages/${existing.id}`, { embeds: [counter] });
    else await discord("POST", `/channels/${id}/messages`, { embeds: [counter] });
  } catch (error) {
    console.error("Annonce Discord impossible :", error instanceof Error ? error.message : error);
  }
}

type DiscordMessage = { id: string; author?: { id: string }; embeds?: { title?: string }[] };

/** Annonce une nouvelle publication dans #research (groupes publics uniquement). */
export async function announceResearch(group: ResearchGroup, post: ResearchPost): Promise<void> {
  if (!process.env.DISCORD_BOT_TOKEN || group.visibility !== "public") return;
  try {
    // contre le spam : 3 annonces par auteur et 20 au total par heure (le site publie quand même)
    if (!(await consume(`discord:research:${post.authorId}`, 3, 3600))) return;
    if (!(await consume("discord:research", 20, 3600))) return;
    const id = await channelId("research");
    if (!id) return;
    const url = `${siteUrl()}/research/${group.id}/${post.id}`;
    const intro = post.summary || post.body;
    await discord("POST", `/channels/${id}/messages`, {
      content: "📄 **New research on Griffin Lab**",
      embeds: [
        {
          title: plain(post.title, 200),
          url,
          color: 0x22c55e,
          description: plain(intro, 300),
          fields: [
            { name: "Space", value: plain(group.name, 80) || "—", inline: true },
            { name: "By", value: plain(post.authorName, 60) || "—", inline: true },
            ...(post.category ? [{ name: "Topic", value: plain(post.category, 60) || "—", inline: true }] : []),
          ],
          footer: { text: post.attachments.length ? `${post.attachments.length} attachment(s)` : "Griffin Lab research" },
          timestamp: post.createdAt,
        },
      ],
      allowed_mentions: { parse: [] }, // un titre ne peut pas notifier @everyone
    });
  } catch (error) {
    console.error("Annonce Discord impossible :", error instanceof Error ? error.message : error);
  }
}
