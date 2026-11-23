# Fleija

| Dossier | Contenu |
| --- | --- |
| [`griffin-lab-site/`](griffin-lab-site) | le site (Next.js) : propositions, recherches, books, comptes — voir son [README](griffin-lab-site/README.md) |
| [`discord/`](discord) | le bot du serveur Discord Fleija et les outils pour construire le serveur — voir son [README](discord/README.md) |
| [`video/`](video) | la vidéo motion design de présentation (`render.py` l'exporte en `.webm`) |

En production (VPS `ssh griffin`) :

- site : `/srv/griffin-lab`, service `griffin-lab`, secrets `/etc/griffin-lab.env` ;
- bot Discord : `/srv/griffin-discord`, service `griffin-discord`, jeton `/etc/griffin-discord.env`.
