# Discord — Griffin Lab

Tout ce qui tourne **à côté** du site pour le serveur Discord « Lab ». Aucune
dépendance : Node 22 suffit.

```
discord/
├── bot.mjs              bot permanent (service systemd griffin-discord)
├── lib/discord-api.mjs  jeton, appels à l'API Discord, adresses du site
└── tools/
    ├── setup.mjs        construit / remet à jour le serveur (rôles, salons, règles)
    └── counter.mjs      (re)poste le message « Strategy counter » de #strategy-ideas
```

## Le bot (`bot.mjs`)

- Donne le rôle **Member** à chaque arrivée et souhaite la bienvenue dans #general.
- Poste chaque jour à 8 h UTC les rendements 30 jours des books dans
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

- `announce.ts` : annonces des nouvelles recherches (#research) et des statuts
  des propositions + compteur (#strategy-ideas), anonymes ;
- `links.ts` : photos de profil Discord des membres (affichées dans les books) ;
- `oauth.ts` : liaison d'un compte Discord à un compte e-mail ou Google
  (`/api/discord/link`).
