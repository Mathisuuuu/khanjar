# Discord — Fleija

Tout ce qui tourne **à côté** du site pour le serveur Discord Fleija. Aucune
dépendance : Node 22 suffit.

```
discord/
├── bot.mjs              bot permanent (service systemd griffin-discord)
├── lib/discord-api.mjs  jeton, appels à l'API Discord, adresses du site
└── tools/
    ├── setup.mjs        construit / remet à jour le serveur (rôles, salons, règles)
    └── counter.mjs      (re)poste le message « Strategy counter » de #strategy-counter
```

## Le bot (`bot.mjs`)

- Donne le rôle **Member** à chaque arrivée et souhaite la bienvenue dans #welcome.
- Poste chaque jour à 8 h UTC le rendement de la veille (1 J) et le « all time » des books dans
  #books-performance (lus sur `/api/books/live` du site).
  `node bot.mjs --rendements-maintenant` pour poster tout de suite.

Sur le VPS il est installé dans `/srv/griffin-discord`, avec le jeton dans
`/etc/griffin-discord.env` (`DISCORD_BOT_TOKEN=…`, droits 600 root).

## Les outils

```powershell
$env:DISCORD_BOT_TOKEN = Read-Host "Bot token" -MaskInput
node discord/tools/setup.mjs --apercu   # montre ce qui changerait
node discord/tools/setup.mjs            # applique (relançable sans doublon)
```

Le jeton peut aussi être mis dans `discord/.discord-token` (ignoré par git).

## Côté site

Le site parle aussi à Discord, depuis son propre code
(`griffin-lab-site/src/lib/discord/`) :

- `announce.ts` : annonces des nouvelles recherches (#research), compteur des
  propositions et verdicts anonymes (validée ou refusée seulement) dans
  #strategy-counter ;
- `proposal-events.ts` : à chaque changement de statut, compteur et verdict,
  plus un message privé à l'auteur (reçue, en test, validée avec son
  certificat, refusée avec le motif) s'il a un compte Discord connu du site ;
- `certificate.ts` : certificat en message privé à la validation, et dans
  #certificates quand l'auteur choisit de le partager depuis son compte ;
- `links.ts` : photos de profil Discord des membres (affichées dans les books) ;
- `oauth.ts` : liaison d'un compte Discord à un compte e-mail ou Google
  (`/api/discord/link`).
