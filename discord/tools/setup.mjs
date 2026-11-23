#!/usr/bin/env node
/**
 * Construit le serveur Discord de Fleija (en anglais) : rôles, catégories,
 * salons, permissions, messages d'accueil et de règles épinglés.
 *
 * Le jeton du bot est lu dans la variable d'environnement DISCORD_BOT_TOKEN,
 * jamais en argument (il resterait dans l'historique du terminal). Le script ne
 * contacte que l'API de Discord.
 *
 * À défaut, il est lu dans le fichier discord/.discord-token (ignoré par git). Sans
 * --guild, le script prend le serveur où se trouve le bot s'il n'y en a qu'un.
 *
 * Utilisation (PowerShell) :
 *   $env:DISCORD_BOT_TOKEN = Read-Host "Bot token" -MaskInput
 *   node discord/tools/setup.mjs --apercu   # ne modifie rien
 *   node discord/tools/setup.mjs            # applique
 *
 * Options :
 *   --site <url>   adresse du site citée dans les messages (défaut : https://fleija.live)
 *
 * Relançable sans doublon : rôles et salons sont retrouvés par leur nom, leurs
 * réglages sont remis à jour ; les messages épinglés par le bot sont modifiés
 * au lieu d'être postés de nouveau. Rien d'existant n'est supprimé.
 */

import { channelKey, createApi, loadToken } from "../lib/discord-api.mjs";

/* ---------- Arguments ---------- */

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
let guildId = option("--guild");
const preview = args.includes("--apercu") || args.includes("--dry-run");
const site = (option("--site") ?? "https://fleija.live").replace(/\/$/, "");

if (guildId && !/^\d{17,20}$/.test(guildId)) {
  console.error("Identifiant de serveur invalide : --guild 123456789012345678");
  process.exit(1);
}
const api = createApi(loadToken(), "fleija-setup");

/* ---------- Permissions Discord ---------- */

const P = {
  KICK_MEMBERS: 1n << 1n,
  BAN_MEMBERS: 1n << 2n,
  ADD_REACTIONS: 1n << 6n,
  VIEW_CHANNEL: 1n << 10n,
  SEND_MESSAGES: 1n << 11n,
  MANAGE_MESSAGES: 1n << 13n,
  EMBED_LINKS: 1n << 14n,
  ATTACH_FILES: 1n << 15n,
  READ_MESSAGE_HISTORY: 1n << 16n,
  MENTION_EVERYONE: 1n << 17n,
  CONNECT: 1n << 20n,
  SPEAK: 1n << 21n,
  MANAGE_NICKNAMES: 1n << 27n,
  MANAGE_THREADS: 1n << 34n,
  USE_APPLICATION_COMMANDS: 1n << 31n,
  CREATE_PUBLIC_THREADS: 1n << 35n,
  CREATE_PRIVATE_THREADS: 1n << 36n,
  SEND_MESSAGES_IN_THREADS: 1n << 38n,
  USE_EXTERNAL_APPS: 1n << 50n,
  MODERATE_MEMBERS: 1n << 40n,
};
const bits = (...names) => names.reduce((sum, n) => sum | P[n], 0n);

const READ = bits("VIEW_CHANNEL", "READ_MESSAGE_HISTORY");
const WRITE = bits("SEND_MESSAGES", "SEND_MESSAGES_IN_THREADS", "CREATE_PUBLIC_THREADS", "ADD_REACTIONS");
// salon en lecture seule : aucune façon d'y écrire (message, fil public ou privé, application)
const READ_ONLY_DENY =
  (WRITE & ~bits("ADD_REACTIONS")) | bits("CREATE_PRIVATE_THREADS", "USE_APPLICATION_COMMANDS", "USE_EXTERNAL_APPS");
const VOICE = bits("VIEW_CHANNEL", "CONNECT", "SPEAK");

/* ---------- Structure du serveur ---------- */

// rôles du site : Admin et Team ; un rôle par book (couleurs du site)
const ROLES = [
  {
    key: "admin",
    name: "Admin",
    color: 0xef4444,
    hoist: true,
    permissions: bits(
      "KICK_MEMBERS",
      "BAN_MEMBERS",
      "MANAGE_MESSAGES",
      "MANAGE_THREADS",
      "MODERATE_MEMBERS",
      "MANAGE_NICKNAMES",
      "MENTION_EVERYONE",
    ),
  },
  { key: "team", name: "Team", color: 0x22c55e, hoist: true, permissions: bits("MANAGE_MESSAGES", "MANAGE_THREADS", "MODERATE_MEMBERS") },
  { key: "bookA", name: "Book A", color: 0x38bdf8, hoist: false, permissions: 0n },
  { key: "bookB", name: "Book B", color: 0xa855f7, hoist: false, permissions: 0n },
  { key: "bookC", name: "Book C", color: 0xf5b524, hoist: false, permissions: 0n },
  // donné automatiquement à l'arrivée par le bot d'accueil (scripts/discord-welcome.mjs)
  { key: "member", name: "Member", color: 0x3b82f6, hoist: true, permissions: 0n },
];

/**
 * Droits par salon. `everyone` : ce que voit un membre ; `staff` : Team et Admin.
 * open = les membres écrivent ; read-only = tout le monde lit, seuls le staff et le
 * bot écrivent ; private = staff + rôles listés.
 */
const STRUCTURE = [
  {
    category: "📌 WELCOME",
    access: "read-only",
    channels: [
      { name: "👋welcome", topic: "Start here: what Fleija is and how it works." },
      { name: "🚨announcements", topic: "News: validated strategies, new books, site updates." },
      { name: "📱website", topic: "The Fleija website: links and updates." },
    ],
  },
  {
    category: "💬 COMMUNITY",
    access: "open",
    channels: [
      { name: "🗨️general", topic: "Everything Fleija." },
      { name: "💵strategy-ideas", topic: "Discuss an idea before submitting it on the site." },
      { name: "❓questions", topic: "Pine Script, Python, backtesting: ask and help." },
    ],
  },
  {
    category: "📚 BOOKS",
    access: "read-only",
    channels: [
      // le site y tient le compteur des propositions et n'y annonce que les verdicts (validée ou refusée)
      { name: "📊strategy-counter", topic: "Live strategy counter and verdicts: validated or rejected strategies only.", access: "read-only" },
      // le bot y poste les certificats que leurs auteurs choisissent de partager depuis le site
      { name: "🎓certificates", topic: "Fleija certificates shared by members whose strategy was validated.", access: "read-only" },
      { name: "📁test-results", topic: "Test script verdicts: validated, rejected, book placement.", access: "read-only" },
      // le site y annonce les nouvelles recherches ; on en discute dans #general
      { name: "🔎research", topic: "New research published on the Fleija website." },
      // public, en lecture seule : le bot y poste chaque jour le rendement de la veille et le « all time »
      { name: "📝books-performance", topic: "Daily 1-day and all-time returns of every book. Not financial advice.", access: "read-only" },
    ],
  },
  {
    category: "🛠️ TEAM",
    access: "private",
    roles: [],
    channels: [
      { name: "team", topic: "Fleija team." },
      { name: "moderation", topic: "Moderation reports and decisions." },
    ],
  },
];

/* ---------- Messages épinglés ---------- */

const GREEN = 0x22c55e;

const WELCOME = {
  channel: "welcome",
  // anciens titres : le message déjà posté sous ce titre est modifié au lieu d'être reposté
  previousTitles: ["Welcome to Griffin Lab"],
  embeds: [
    {
      title: "Welcome to Fleija",
      color: GREEN,
      description:
        "Fleija is a trading bot built by its community.\n\n" +
        "Submit a strategy idea on the site: it goes through the same test script as every other one. " +
        "If it's validated, it joins one of the bot's **books**, the bot gets better and you get **full access to that book**. " +
        "**Everything is free.**",
      fields: [
        {
          name: "Start here",
          value:
            "1. Read the community rules below\n" +
            "2. Say hi in <#general>\n" +
            "3. Discuss your idea in <#strategy-ideas>\n" +
            `4. Submit it on the site: ${site}/submit`,
        },
        { name: "Links", value: `Site: ${site}\nRules and test script: ${site}/about` },
      ],
      footer: { text: "Nothing on this server is financial advice. Trading involves a risk of loss." },
    },
  ],
};

const RULES = {
  channel: "welcome",
  embeds: [
    {
      title: "Community rules",
      color: 0xef4444,
      description:
        "1. **Be respectful.** Treat everyone the way you'd like to be treated. Disagree with ideas, never attack people.\n" +
        "2. **No harassment, hate speech or discrimination.** Racism, sexism, homophobia, threats and personal attacks lead to an immediate ban.\n" +
        "3. **Keep it clean.** No NSFW, violent or shocking content, in messages, names or avatars.\n" +
        "4. **No spam or self-promotion.** No referral links, paid groups, ads or unsolicited DMs.\n" +
        "5. **No scams.** Never ask for money, keys or passwords. Staff will never DM you first for these.\n" +
        "6. **Respect privacy.** Don't share anyone's personal information, and what's posted in a book channel stays there.\n" +
        "7. **Credit your sources.** Don't post someone else's work, code or paper as your own.\n" +
        "8. **Stay on topic.** Use the right channel and avoid flooding (walls of text, repeated messages, mass mentions).\n\n" +
        "Breaking these rules leads to a warning, a mute, a kick or a ban depending on how serious it is. " +
        "By staying on this server, you accept these rules.",
    },
    {
      title: "Contribution rules",
      color: GREEN,
      description:
        "Three formats are accepted, alone or combined: **an idea** (the rule in a few sentences), " +
        "**a script** (Pine Script or Python) or **a research paper**.\n\n" +
        "Every submission goes through the same seven checks:",
      fields: [
        { name: "1. Backtest", value: "15 years · 2011–2025", inline: true },
        { name: "2. Out of sample", value: "5 years · 2021–2025", inline: true },
        { name: "3. Anti-overfitting", value: "Walk-forward · deflated Sharpe", inline: true },
        { name: "4. IC", value: "Information coefficient > 0.05", inline: true },
        { name: "5. Max drawdown", value: "< annual return", inline: true },
        { name: "6. Monte Carlo", value: "1,000 runs", inline: true },
        {
          name: "7. Book placement",
          value: "A validated strategy joins a book it is weakly correlated with (ρ < 0.3).",
        },
        { name: "Full details", value: `${site}/about#rules` },
      ],
    },
  ],
};

const MESSAGES = [WELCOME, RULES];

/* ---------- Appels à l'API Discord ---------- */

/* ---------- Construction ---------- */

const log = (symbol, text) => console.log(`${symbol} ${text}`);
// emojis et majuscules ignorés : un salon renommé à la main est retrouvé
const isSame = (a, b) => channelKey(a) === channelKey(b);

async function main() {
  const me = await api("GET", "/users/@me");
  if (!guildId) {
    // sans --guild : le serveur où se trouve le bot, s'il n'y en a qu'un
    const guilds = await api("GET", "/users/@me/guilds");
    if (guilds.length !== 1) {
      throw new Error(`Le bot est sur ${guilds.length} serveur(s) : précise --guild <id>.\n` + guilds.map((g) => `  ${g.id}  ${g.name}`).join("\n"));
    }
    guildId = guilds[0].id;
  }
  const guild = await api("GET", `/guilds/${guildId}`);
  console.log(`Serveur : ${guild.name} · bot : ${me.username}${preview ? " · APERÇU (rien n'est modifié)" : ""}\n`);

  /* Rôles */
  const existingRoles = await api("GET", `/guilds/${guildId}/roles`);

  // Discord refuse de donner à un rôle un droit que le bot n'a pas : on ne garde que les siens
  const botMember = await api("GET", `/guilds/${guildId}/members/${me.id}`);
  let botPerms = 0n;
  for (const r of existingRoles) if (r.id === guildId || botMember.roles.includes(r.id)) botPerms |= BigInt(r.permissions);
  const isAdmin = (botPerms & (1n << 3n)) !== 0n;
  const missing = [];

  const roleIds = {};
  for (const role of ROLES) {
    const found = existingRoles.find((r) => isSame(r.name, role.name));
    const granted = isAdmin ? role.permissions : role.permissions & botPerms;
    const lacking = Object.entries(P).filter(([, b]) => role.permissions & b & ~granted).map(([n]) => n);
    if (lacking.length) missing.push(`${role.name} : ${lacking.join(", ")}`);
    // un droit coché à la main sur un rôle existant n'est jamais retiré
    const permissions = found ? BigInt(found.permissions) | granted : granted;
    const body = { name: role.name, color: role.color, hoist: role.hoist, mentionable: false, permissions: permissions.toString() };
    if (found) {
      roleIds[role.key] = found.id;
      if (!preview) await api("PATCH", `/guilds/${guildId}/roles/${found.id}`, body);
      log("✓", `rôle ${role.name} (existant, mis à jour)`);
    } else if (preview) {
      roleIds[role.key] = `<${role.key}>`;
      log("+", `rôle ${role.name} (à créer)`);
    } else {
      const created = await api("POST", `/guilds/${guildId}/roles`, body);
      roleIds[role.key] = created.id;
      log("+", `rôle ${role.name} (créé)`);
    }
  }

  // @everyone ne doit pas pouvoir mentionner @everyone / @here (spam de notifications)
  const everyoneRole = existingRoles.find((r) => r.id === guildId);
  if (BigInt(everyoneRole.permissions) & P.MENTION_EVERYONE) {
    const permissions = (BigInt(everyoneRole.permissions) & ~P.MENTION_EVERYONE).toString();
    if (!preview) await api("PATCH", `/guilds/${guildId}/roles/${guildId}`, { permissions });
    log(preview ? "+" : "✓", "@everyone : mention @everyone retirée");
  }

  /* Permissions d'un salon */
  const everyone = guildId; // l'identifiant du rôle @everyone est celui du serveur
  const staff = [roleIds.admin, roleIds.team];
  const overwrites = (access, roles = [], voice = false) => {
    const view = voice ? VOICE : READ;
    const role = (id, allow, deny = 0n) => ({ id, type: 0, allow: allow.toString(), deny: deny.toString() });
    const staffAllow = view | WRITE | bits("EMBED_LINKS", "ATTACH_FILES");
    if (access === "private") {
      // le bot garde l'accès aux salons privés, sinon il ne peut plus les gérer
      const botAllow = view | bits("SEND_MESSAGES", "EMBED_LINKS", "ATTACH_FILES", "MANAGE_MESSAGES") | (1n << 4n);
      return [
        role(everyone, 0n, bits("VIEW_CHANNEL")),
        { id: me.id, type: 1, allow: botAllow.toString(), deny: "0" },
        ...staff.map((id) => role(id, staffAllow)),
        ...roles.map((key) => role(roleIds[key], view | WRITE | bits("EMBED_LINKS", "ATTACH_FILES"))),
      ];
    }
    if (access === "read-only") {
      // Discord refuse qu'un bot retire à @everyone un droit qu'il perdrait lui-même : il les garde
      const botAllow = READ | READ_ONLY_DENY | bits("EMBED_LINKS", "ATTACH_FILES", "MANAGE_MESSAGES");
      return [
        role(everyone, READ | bits("ADD_REACTIONS"), READ_ONLY_DENY),
        { id: me.id, type: 1, allow: botAllow.toString(), deny: "0" },
        ...staff.map((id) => role(id, staffAllow)),
      ];
    }
    return [role(everyone, view | WRITE | bits("EMBED_LINKS", "ATTACH_FILES"))];
  };

  /* Catégories et salons */
  let channels = await api("GET", `/guilds/${guildId}/channels`);
  const channelIds = {};
  const upsert = async (spec, type, parentId) => {
    // retrouvé par son nom, où qu'il soit : un salon renommé ou déplacé à la main garde son nom et sa place
    const found = channels.find((c) => c.type === type && isSame(c.name, spec.name));
    const body = {
      name: spec.name,
      type,
      ...(type !== 4 && parentId ? { parent_id: parentId } : {}),
      ...(type === 0 ? { topic: spec.topic ?? "" } : {}),
      permission_overwrites: spec.overwrites,
    };
    const label = type === 4 ? `catégorie ${spec.name}` : type === 2 ? `  🔊 ${spec.name}` : `  #${spec.name}`;
    if (found) {
      // nom, place et sujet choisis à la main sont gardés ; seules les permissions sont remises
      const { name: _name, parent_id: _parent, topic: _topic, ...update } = body;
      if (type === 0 && !found.topic) update.topic = spec.topic ?? "";
      if (!preview) await api("PATCH", `/channels/${found.id}`, update);
      log("✓", `${label} (existant, mis à jour)`);
      return found.id;
    }
    if (preview) {
      log("+", `${label} (à créer)`);
      return `<${spec.name}>`;
    }
    const created = await api("POST", `/guilds/${guildId}/channels`, body);
    channels = [...channels, created];
    log("+", `${label} (créé)`);
    return created.id;
  };

  for (const group of STRUCTURE) {
    const categoryId = await upsert({ name: group.category, overwrites: overwrites(group.access, group.roles) }, 4, null);
    for (const channel of group.channels) {
      const access = channel.access ?? group.access;
      const roles = channel.roles ?? group.roles ?? [];
      const id = await upsert(
        { name: channel.name, topic: channel.topic, overwrites: overwrites(access, roles, channel.voice) },
        channel.voice ? 2 : 0,
        categoryId,
      );
      if (!channel.voice) channelIds[channelKey(channel.name)] = id;
    }
  }

  /* Messages épinglés (modifiés s'ils existent déjà) */
  const mention = (text) => text.replace(/<#([a-z-]+)>/g, (_, name) => (channelIds[name]?.startsWith("<") ? `#${name}` : `<#${channelIds[name]}>`));
  const withMentions = (embeds) =>
    embeds.map((embed) => ({
      ...embed,
      description: embed.description && mention(embed.description),
      fields: embed.fields?.map((field) => ({ ...field, value: mention(field.value) })),
    }));

  console.log("");
  for (const message of MESSAGES) {
    const channelId = channelIds[channelKey(message.channel)];
    const embeds = withMentions(message.embeds);
    const title = `message « ${message.embeds[0].title} » dans #${message.channel}`;
    if (channelId.startsWith("<")) {
      log("+", `${title} (à poster et épingler)`);
      continue;
    }
    // message déjà posté par le bot (parmi les 100 derniers) : modifié au lieu d'être reposté
    const recent = await api("GET", `/channels/${channelId}/messages?limit=100`);
    const titles = [message.embeds[0].title, ...(message.previousTitles ?? [])];
    const mine =
      recent.find((m) => m.author?.id === me.id && m.embeds?.[0]?.title === titles[0]) ??
      recent.find((m) => m.author?.id === me.id && titles.includes(m.embeds?.[0]?.title));
    if (preview) {
      log(mine ? "✓" : "+", `${title} (${mine ? "déjà posté, sera mis à jour" : "à poster et épingler"})`);
      continue;
    }
    let target = mine;
    if (mine) {
      await api("PATCH", `/channels/${channelId}/messages/${mine.id}`, { embeds });
      log("✓", `${title} (mis à jour)`);
    } else {
      target = await api("POST", `/channels/${channelId}/messages`, { embeds });
      log("+", `${title} (posté)`);
    }
    if (!target.pinned) {
      try {
        await api("PUT", `/channels/${channelId}/pins/${target.id}`);
        log("+", `${title} épinglé`);
      } catch {
        log("!", `${title} non épinglé : le bot n'a pas le droit « Épingler des messages » (à faire à la main)`);
      }
    }
  }

  if (missing.length) {
    console.log("\nDroits non accordés (le bot ne les a pas ; à cocher à la main dans Paramètres du serveur → Rôles) :");
    for (const line of missing) console.log(`  - ${line}`);
  }
  console.log(preview ? "\nAperçu terminé : relance sans --apercu pour appliquer." : "\nServeur prêt.");
}

main().catch((error) => {
  console.error(`\nErreur : ${error.message}`);
  process.exit(1);
});
