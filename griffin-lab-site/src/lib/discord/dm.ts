import "server-only";
import { getDiscordLink } from "@/lib/discord/links";

/**
 * Messages du bot Discord : salon ou message privé, avec une image en pièce
 * jointe si besoin. Le message privé suppose que la personne a un compte
 * Discord connu du site (connexion Discord ou compte lié), est sur le serveur
 * et accepte les messages privés.
 */

const API = "https://discord.com/api/v10";
const DISCORD_ID = /^\d{17,20}$/;

const headers = () => ({
  Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
  "User-Agent": "DiscordBot (fleija-site, 1.0)",
});

export const botConfigured = () => Boolean(process.env.DISCORD_BOT_TOKEN);

export const siteUrl = () => (process.env.AUTH_URL ?? "https://fleija.live").replace(/\/$/, "");

/** Couleurs des statuts, les mêmes que sur le site (components/proposals/ProposalQueue.module.css). */
export const STATUS_COLORS = { pending: 0xf5b524, testing: 0x38bdf8, validated: 0x22c55e, rejected: 0xef4444 } as const;

/** Encadré aux couleurs du site : logo Minitel et nom « Fleija » en tête (src/app/apple-icon.png). */
export function fleijaEmbed(embed: { title?: string; url?: string; description: string; color?: number; image?: string }) {
  return {
    author: { name: "Fleija", url: siteUrl(), icon_url: `${siteUrl()}/apple-icon.png` },
    color: STATUS_COLORS.validated,
    ...embed,
    ...(embed.image ? { image: { url: embed.image } } : {}),
    timestamp: new Date().toISOString(),
  };
}

/** Bouton lien sous le message (aucune interaction à gérer côté bot). */
export const linkButton = (label: string, url: string) => ({ type: 1, components: [{ type: 2, style: 5, label, url }] });

/** Identifiant Discord d'un compte du site : compte lié, ou connexion faite avec Discord. */
async function discordIdOf(userKey: string): Promise<string | null> {
  const linked = (await getDiscordLink(userKey))?.discordId;
  if (linked) return linked;
  const [provider, id] = userKey.split(":");
  return provider === "discord" && DISCORD_ID.test(id ?? "") ? id : null;
}

/** Salon de message privé avec ce compte, ou `null` s'il n'a pas de Discord connu. */
export async function openDm(userKey: string): Promise<string | null> {
  const discordId = await discordIdOf(userKey);
  if (!discordId) return null;
  const res = await fetch(`${API}/users/@me/channels`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ recipient_id: discordId }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`ouverture du message privé : ${res.status}`);
  return ((await res.json()) as { id: string }).id;
}

/** Message dans un salon (ou message privé), avec une image PNG facultative. Lève une erreur si l'envoi échoue. */
export async function postMessage(
  channel: string,
  message: { content?: string; embeds?: unknown[]; components?: unknown[] },
  image?: { data: Buffer; filename: string },
): Promise<void> {
  const payload = { ...message, allowed_mentions: { parse: [] } };
  let init: RequestInit;
  if (image) {
    const form = new FormData();
    form.append("payload_json", JSON.stringify({ ...payload, attachments: [{ id: 0, filename: image.filename }] }));
    form.append("files[0]", new Blob([new Uint8Array(image.data)], { type: "image/png" }), image.filename);
    init = { method: "POST", headers: headers(), body: form };
  } else {
    init = { method: "POST", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify(payload) };
  }
  const res = await fetch(`${API}/channels/${channel}/messages`, { ...init, signal: AbortSignal.timeout(15000) });
  // 403 en message privé : la personne n'accepte pas les messages privés ou n'est pas sur le serveur
  if (!res.ok) throw new Error(`envoi : ${res.status}`);
}
