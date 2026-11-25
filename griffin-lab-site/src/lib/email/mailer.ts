import "server-only";
import { createTransport, type Transporter } from "nodemailer";

/**
 * Envoi d'e-mails par SMTP (Brevo, OVH, Mailjet, Gmail… : tous fournissent
 * des identifiants SMTP).
 * - SMTP_URL : smtps://utilisateur:motdepasse@serveur:465 (ou smtp://…:587)
 * - MAIL_FROM : expéditeur, ex. « Fleija <no-reply@ton-domaine> »
 * En développement sans SMTP_URL, l'e-mail est affiché dans la console.
 */

/** Pièce jointe ; avec `cid`, elle peut aussi s'afficher dans le corps (`<img src="cid:…">`). */
export type MailAttachment = { filename: string; content: Buffer; contentType?: string; cid?: string };

export type Mail = { to: string; subject: string; text: string; html: string; attachments?: MailAttachment[] };

let transport: Transporter | undefined;

export function isMailConfigured(): boolean {
  return !!process.env.SMTP_URL && !!process.env.MAIL_FROM;
}

/** Peut-on envoyer (ou, en développement, afficher) un e-mail ? */
export function canSendMail(): boolean {
  return isMailConfigured() || process.env.NODE_ENV !== "production";
}

export async function sendMail(mail: Mail): Promise<void> {
  if (!isMailConfigured()) {
    if (process.env.NODE_ENV === "production") throw new Error("Envoi d'e-mails non configuré (SMTP_URL, MAIL_FROM).");
    const files = mail.attachments?.map((a) => a.filename).join(", ");
    console.log(`\n[e-mail de développement] À : ${mail.to}\nObjet : ${mail.subject}${files ? `\nPièces jointes : ${files}` : ""}\n\n${mail.text}\n`);
    // aperçu du rendu HTML : data/dernier-email.html, pièces jointes à côté (dossier ignoré par git)
    const { mkdir, writeFile } = await import("node:fs/promises");
    await mkdir("data", { recursive: true });
    let html = mail.html;
    for (const attachment of mail.attachments ?? []) {
      const name = `dernier-email-${attachment.filename}`;
      await writeFile(`data/${name}`, attachment.content).catch(() => undefined);
      if (attachment.cid) html = html.replaceAll(`cid:${attachment.cid}`, name);
    }
    await writeFile("data/dernier-email.html", html).catch(() => undefined);
    return;
  }
  transport ??= createTransport(process.env.SMTP_URL);
  await transport.sendMail({ from: process.env.MAIL_FROM, ...mail });
}

/** Échappe le texte inséré dans le HTML d'un e-mail. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
