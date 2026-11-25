import { escapeHtml } from "@/lib/email/mailer";
import type { Locale } from "@/lib/i18n/core";
import type { ProposalStatus, ProposalType } from "@/lib/proposals/types";

/**
 * E-mails de suivi d'une proposition : reçue (en file), de nouveau en file, en
 * test, validée (avec le certificat dans le message et en pièce jointe) et
 * refusée (avec le motif). Même habillage que les e-mails à code : fond
 * #08090a, carte #111214, logo Minitel « FLEIJA », bouton vert.
 */

const SITE = (process.env.AUTH_URL ?? "https://fleija.live").replace(/\/$/, "");
const LOGO_URL = `${SITE}/apple-icon.png`;
/** Identifiant de l'image du certificat jointe à l'e-mail (affichée avec `cid:`). */
export const CERTIFICATE_CID = "fleija-certificate";

export type ProposalEmailInput = {
  name: string;
  title: string;
  type: ProposalType;
  status: ProposalStatus;
  /** statut d'avant, `null` pour une proposition qui vient d'être déposée */
  before: ProposalStatus | null;
  reason?: string | null;
  score?: number | null;
  /** le certificat est joint (validée) */
  withCertificate?: boolean;
};

const STATUS_STYLE: Record<ProposalStatus, { color: string; label: Record<Locale, string> }> = {
  pending: { color: "#f5b524", label: { fr: "En file", en: "In the queue" } },
  testing: { color: "#38bdf8", label: { fr: "En test", en: "In testing" } },
  validated: { color: "#22c55e", label: { fr: "Validée", en: "Validated" } },
  rejected: { color: "#ef4444", label: { fr: "Refusée", en: "Rejected" } },
};

const KIND: Record<Locale, Record<ProposalType, string>> = {
  // toujours au féminin : les phrases accordent « validée », « reçue »…
  fr: { idea: "ton idée de stratégie", script: "ta stratégie", paper: "ta proposition de papier" },
  en: { idea: "your strategy idea", script: "your strategy", paper: "your paper" },
};

type Content = { subject: string; heading: string; lines: string[]; button: { label: string; href: string } };

function content(input: ProposalEmailInput, locale: Locale): Content {
  const kind = KIND[locale][input.type] ?? (locale === "en" ? "your proposal" : "ta proposition");
  const Kind = kind.charAt(0).toUpperCase() + kind.slice(1);
  const t = input.title;
  const follow = { label: locale === "en" ? "Follow it on Fleija" : "Suivre sur Fleija", href: `${SITE}/account#activite` };
  const en = locale === "en";

  switch (input.status) {
    case "pending":
      return input.before === null
        ? {
            subject: en ? `We received “${t}”` : `« ${t} » est bien reçue`,
            heading: en ? "Proposal received" : "Proposition reçue",
            lines: en
              ? [`${Kind} is in the queue. The team will put it through the test script: you'll get an email at each step.`]
              : [`${Kind} est dans la file. L'équipe va la passer au script de test : tu recevras un e-mail à chaque étape.`],
            button: follow,
          }
        : {
            subject: en ? `“${t}” is back in the queue` : `« ${t} » est de nouveau en file`,
            heading: en ? "Back in the queue" : "De nouveau en file",
            lines: en ? [`${Kind} is back in the queue and will be tested again.`] : [`${Kind} est de nouveau dans la file et sera testée à nouveau.`],
            button: follow,
          };
    case "testing":
      return {
        subject: en ? `“${t}” is going through the test script` : `« ${t} » passe le script de test`,
        heading: en ? "In testing" : "En test",
        lines: en
          ? [`${Kind} is now going through the test script, the same one every strategy goes through. You'll get an email with the verdict.`]
          : [`${Kind} passe maintenant le script de test, le même pour toutes les stratégies. Tu recevras un e-mail avec le verdict.`],
        button: follow,
      };
    case "validated": {
      const score = input.score == null ? "" : en ? ` with a score of ${input.score}/100` : ` avec un score de ${input.score}/100`;
      return {
        subject: en ? `“${t}” is validated: here is your certificate` : `« ${t} » est validée : voici ton certificat`,
        heading: en ? "Congratulations, it's validated!" : "Bravo, c'est validé !",
        lines: en
          ? [
              `${Kind} passed every check and was validated${score}.`,
              input.withCertificate
                ? "Here is your Fleija certificate (also attached). You can show it on your public profile or share it on Discord from your account page."
                : "Your Fleija certificate is waiting for you on your account page.",
            ]
          : [
              `${Kind} a passé toutes les vérifications et a été validée${score}.`,
              input.withCertificate
                ? "Voici ton certificat Fleija (aussi en pièce jointe). Tu peux l'afficher sur ton profil public ou le partager sur Discord depuis ta page compte."
                : "Ton certificat Fleija t'attend sur ta page compte.",
            ],
        button: { label: en ? "See my certificate" : "Voir mon certificat", href: `${SITE}/account#certificats` },
      };
    }
    case "rejected":
      return {
        subject: en ? `“${t}” was not validated` : `« ${t} » n'a pas été validée`,
        heading: en ? "Not validated this time" : "Pas validée cette fois",
        lines: en
          ? [`${Kind} did not pass the checks and was not validated.`, "You can improve it and submit it again."]
          : [`${Kind} n'a pas passé les vérifications et n'a pas été validée.`, "Tu peux l'améliorer et la proposer à nouveau."],
        button: { label: en ? "Submit again" : "Proposer à nouveau", href: `${SITE}/submit` },
      };
  }
}

export function proposalEmail(input: ProposalEmailInput, locale: Locale) {
  const c = content(input, locale);
  const status = STATUS_STYLE[input.status];
  const en = locale === "en";
  const hello = en ? `Hi ${input.name},` : `Salut ${input.name},`;
  const reasonLabel = en ? "Reason" : "Motif";
  const reason = input.status === "rejected" && input.reason ? input.reason.trim() : "";
  const footer = en
    ? "You're receiving this email because you submitted a proposal on Fleija. The figures on Fleija come from simulations and are not investment advice."
    : "Tu reçois cet e-mail parce que tu as fait une proposition sur Fleija. Les chiffres de Fleija viennent de simulations et ne sont pas un conseil en investissement.";
  const font = "font-family:system-ui,-apple-system,'Segoe UI',sans-serif";
  const paragraph = (line: string) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#a1a1aa">${escapeHtml(line)}</p>`;

  const html = `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
<title>${escapeHtml(c.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#08090a">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(c.lines[0])}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#08090a">
<tr><td align="center" style="padding:40px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
    <tr><td align="center" style="padding-bottom:24px;${font}">
      <img src="${LOGO_URL}" width="36" height="36" alt="" style="display:inline-block;width:36px;height:36px;border:0;vertical-align:middle;image-rendering:pixelated">
      <span style="font-size:17px;font-weight:700;color:#f7f8f8;letter-spacing:0.04em;vertical-align:middle;padding-left:6px">FLEIJA</span>
    </td></tr>
    <tr><td style="background:#111214;border:1px solid #1f2125;border-radius:24px;padding:32px 28px;${font};color:#f7f8f8">
      <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto 18px"><tr>
        <td style="padding:6px 14px;border-radius:999px;background:${status.color}22;border:1px solid ${status.color}66;color:${status.color};font-size:13px;font-weight:700;letter-spacing:0.02em">● ${status.label[locale]}</td>
      </tr></table>
      <h1 style="margin:0 0 6px;font-size:24px;line-height:1.25;letter-spacing:-0.03em;text-align:center;color:#f7f8f8">${escapeHtml(c.heading)}</h1>
      <p style="margin:0 0 22px;font-size:15px;line-height:1.5;color:#f7f8f8;text-align:center;font-weight:600">${escapeHtml(input.title)}</p>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#a1a1aa">${escapeHtml(hello)}</p>
      ${paragraph(c.lines[0])}
      ${
        reason
          ? `<div style="margin:8px 0 14px;padding:14px 16px;border-radius:14px;background:#0b0c0e;border:1px solid #3a1d1d"><div style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#f87171">${reasonLabel}</div><div style="font-size:14px;line-height:1.6;color:#e4e4e7;white-space:pre-wrap">${escapeHtml(reason)}</div></div>`
          : ""
      }
      ${c.lines.slice(1).map(paragraph).join("\n      ")}
      ${
        input.withCertificate
          ? `<div style="margin:10px 0 6px"><img src="cid:${CERTIFICATE_CID}" width="464" alt="${en ? "Fleija certificate" : "Certificat Fleija"}" style="display:block;width:100%;max-width:464px;height:auto;border:0;border-radius:12px"></div>`
          : ""
      }
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding-top:18px;text-align:center">
        <a href="${escapeHtml(c.button.href)}" style="display:inline-block;padding:13px 26px;border-radius:999px;background:#22c55e;color:#04140a;font-size:15px;font-weight:700;text-decoration:none">${escapeHtml(c.button.label)}</a>
      </td></tr></table>
    </td></tr>
    <tr><td style="padding:22px 12px 0;${font};font-size:12px;line-height:1.55;color:#71717a;text-align:center">${escapeHtml(footer)}</td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

  const colon = en ? ": " : " : ";
  const text = [
    hello,
    "",
    `${c.heading.replace(/\s*!$/, "")}${colon}${input.title}`,
    "",
    c.lines[0],
    ...(reason ? ["", `${reasonLabel}${colon}${reason}`, ""] : []),
    ...c.lines.slice(1),
    "",
    `${c.button.label}${colon}${c.button.href}`,
    "",
    footer,
  ].join("\n");

  return { subject: c.subject, html, text };
}
