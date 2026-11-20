import "server-only";
import { createTransport, type Transporter } from "nodemailer";

/**
 * Envoi d'e-mails par SMTP (Brevo, OVH, Mailjet, Gmail… : tous fournissent
 * des identifiants SMTP).
 * - SMTP_URL : smtps://utilisateur:motdepasse@serveur:465 (ou smtp://…:587)
 * - MAIL_FROM : expéditeur, ex. « Griffin Lab <no-reply@ton-domaine> »
 * En développement sans SMTP_URL, l'e-mail est affiché dans la console.
 */

export type Mail = { to: string; subject: string; text: string; html: string };

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
    console.log(`\n[e-mail de développement] À : ${mail.to}\nObjet : ${mail.subject}\n\n${mail.text}\n`);
    return;
  }
  transport ??= createTransport(process.env.SMTP_URL);
  await transport.sendMail({ from: process.env.MAIL_FROM, ...mail });
}

/** Échappe le texte inséré dans le HTML d'un e-mail. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
