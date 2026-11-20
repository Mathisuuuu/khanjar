import { escapeHtml } from "@/lib/mail";

/**
 * E-mail de vérification : un code à 6 chiffres bien visible et un bouton
 * « confirmer en un clic ». Mise en page en tableaux et styles en ligne :
 * c'est ce que Gmail, Outlook et Apple Mail affichent de façon fiable.
 */

type Input = { name: string; code: string; link: string; codeMinutes: number; linkHours: number };

export function verificationEmail({ name, code, link, codeMinutes, linkHours }: Input) {
  const safeName = escapeHtml(name);
  const safeLink = escapeHtml(link);
  const digits = code
    .split("")
    .map(
      (digit) =>
        `<td style="padding:0 4px"><div style="width:44px;height:56px;line-height:56px;border-radius:12px;background:#0b0c0e;border:1px solid #26292e;color:#f7f8f8;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:28px;font-weight:700;text-align:center">${digit}</div></td>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
<title>Ton code Griffin Lab</title>
</head>
<body style="margin:0;padding:0;background:#08090a">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">Ton code : ${code}. Il est valable ${codeMinutes} minutes.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#08090a">
<tr><td align="center" style="padding:40px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px">
    <tr><td align="center" style="padding-bottom:24px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif">
      <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#22c55e;vertical-align:middle"></span>
      <span style="font-size:17px;font-weight:700;color:#f7f8f8;letter-spacing:-0.02em;vertical-align:middle;padding-left:6px">Griffin Lab</span>
    </td></tr>
    <tr><td style="background:#111214;border:1px solid #1f2125;border-radius:24px;padding:36px 28px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#f7f8f8">
      <h1 style="margin:0 0 10px;font-size:24px;line-height:1.25;letter-spacing:-0.03em;text-align:center;color:#f7f8f8">Confirme ton adresse e-mail</h1>
      <p style="margin:0 0 28px;font-size:15px;line-height:1.55;color:#a1a1aa;text-align:center">Salut ${safeName}, entre ce code sur la page de vérification pour activer ton compte.</p>
      <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto 12px"><tr>${digits}</tr></table>
      <p style="margin:0 0 30px;font-size:13px;color:#71717a;text-align:center">Valable ${codeMinutes} minutes</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #1f2125;padding-top:26px;text-align:center">
        <p style="margin:0 0 14px;font-size:14px;color:#a1a1aa">Ou confirme en un clic :</p>
        <a href="${safeLink}" style="display:inline-block;padding:13px 26px;border-radius:999px;background:#22c55e;color:#04140a;font-size:15px;font-weight:700;text-decoration:none">Confirmer mon adresse</a>
        <p style="margin:14px 0 0;font-size:12px;color:#71717a">Le lien reste valable ${linkHours} heures.</p>
      </td></tr></table>
    </td></tr>
    <tr><td style="padding:22px 12px 0;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:12px;line-height:1.55;color:#71717a;text-align:center">
      Tu n'as pas créé de compte Griffin Lab ? Ignore cet e-mail, rien ne sera activé.<br>
      Ne partage jamais ce code : l'équipe Griffin Lab ne te le demandera pas.
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    `Salut ${name},`,
    "",
    `Ton code de vérification Griffin Lab : ${code}`,
    `Il est valable ${codeMinutes} minutes.`,
    "",
    "Ou confirme en un clic :",
    link,
    `(lien valable ${linkHours} heures)`,
    "",
    "Tu n'as pas créé de compte ? Ignore cet e-mail.",
    "Ne partage jamais ce code.",
  ].join("\n");

  return { subject: `${code} est ton code Griffin Lab`, html, text };
}
