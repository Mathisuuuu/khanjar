# Griffin Lab — site web

Site de **Griffin Lab**, le bot de trading algorithmique construit par sa communauté : on propose une idée, un script ou un papier SSRN ; si la stratégie passe le script de test, elle entre dans un book du bot et son auteur débloque 100 % du bot.

## Stack

| Outil | Rôle |
| --- | --- |
| [Next.js 15](https://nextjs.org) (App Router) | pages, rendu serveur, routes d'API |
| React 19 + TypeScript (strict) | interface typée |
| CSS Modules + `globals.css` | un fichier de styles par composant, jetons de design globaux |
| [zod](https://zod.dev) | validation des formulaires (partagée client / serveur) |
| [Auth.js v5](https://authjs.dev) (`next-auth`) | comptes : e-mail + mot de passe, Discord, Google |
| Tailwind CSS v4 (thème + utilitaires, sans preflight) + Motion | composants repris d'Aceternity UI (tableau à palettes, Pointer Highlight) |
| ESLint 9 (`eslint-config-next`) | qualité du code |

Pas de librairie de graphiques : les schémas et courbes sont en SVG.

## Démarrer

```bash
npm install
cp .env.example .env.local   # puis renseigne ADMIN_TOKEN et AUTH_SECRET (npx auth secret)
npm run dev                  # http://localhost:3000
```

En local, sans `DATABASE_URL`, le site utilise un PostgreSQL embarqué ([PGlite](https://pglite.dev)) dans `data/pglite` : rien à installer.

| Script | Effet |
| --- | --- |
| `npm run dev` | serveur de développement |
| `npm run build` / `npm start` | build de production puis lancement |
| `npm run lint` | ESLint |
| `npm run typecheck` | vérification TypeScript |

## Variables d'environnement

| Variable | Rôle |
| --- | --- |
| `ADMIN_TOKEN` | jeton secret de la page `/moderation`. Tant qu'il vaut `change-moi` ou est vide, la modération est désactivée. |
| `DATABASE_URL` | connexion PostgreSQL (`postgres://utilisateur:motdepasse@127.0.0.1:5432/base`). Obligatoire en production ; vide en développement = base embarquée `data/pglite`. |
| `AUTH_SECRET` | secret qui signe les sessions (obligatoire). Génère-le avec `npx auth secret`. |
| `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET` | connexion Discord. |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | connexion Google. |
| `NEXT_PUBLIC_DISCORD_URL` | lien d'invitation du rond Discord dans l'en-tête et sur `/account`. |
| `DISCORD_BOT_TOKEN` | jeton du bot Discord : annonces dans #research et #strategy-ideas, mise à jour des photos de profil. Facultatif. |
| `SMTP_URL` / `MAIL_FROM` | envoi des e-mails de confirmation d'inscription (`smtps://utilisateur:motdepasse@serveur:465`, expéditeur `Griffin Lab <no-reply@ton-domaine>`). Sans eux, en production, l'inscription par e-mail est fermée ; en développement, l'e-mail s'affiche dans la console. |
| `AUTH_URL` | adresse publique du site (`https://…`) : liens des e-mails, retour de la liaison Discord. |
| `RESEARCH_TEAM_EMAILS` | e-mails (séparés par des virgules) des membres de l'équipe (le rôle Équipe peut aussi être donné depuis `/admin`). |
| `ADMIN_EMAILS` | e-mails (séparés par des virgules) des administrateurs. Seuls les comptes **e-mail + mot de passe** (adresse confirmée) peuvent être administrateurs, jamais un compte Discord ou Google. |

## Structure

Le dépôt contient trois dossiers : `griffin-lab-site/` (ce site), `discord/` (bot et
outils du serveur Discord, voir [`../discord/README.md`](../discord/README.md)) et
`video/` (vidéo de présentation).

```
src/
├─ app/                      Routes (App Router) : une page = un dossier, URL en anglais
│  ├─ page.tsx               Accueil (assemble les sections)
│  ├─ about/                 Qui nous sommes et règles de contribution
│  ├─ submit/                Proposer une stratégie + file des propositions
│  ├─ research/              Papiers de recherche : liste, création (new/), papier, publication
│  ├─ books/                 Books (canevas des membres, contenu, gestion par l'équipe)
│  ├─ members/[pseudo]/      Profil public d'un membre
│  ├─ sign-in/ welcome/ verify/ forgot-password/   Connexion, pseudo, e-mail, mot de passe
│  ├─ account/               Compte (profil, photo Discord, anonymat, export, suppression)
│  ├─ admin/ moderation/     Administration et modération
│  └─ api/                   auth, proposals, books (live, files), research/files,
│                            strategies/counts, discord/link (liaison du compte Discord)
├─ auth.ts                   Configuration Auth.js (fournisseurs, session JWT, limites)
├─ instrumentation.ts        Au démarrage : connexion à la base et migrations
├─ components/               Composants React, rangés par partie du site
│  ├─ layout/ ui/ i18n/      En-tête, pied de page, boutons, icônes, langue
│  └─ home/ auth/ account/ proposals/ research/ books/ admin/
├─ content/                  Textes et chiffres de l'accueil (à modifier ici)
├─ hooks/                    useInView, usePrefersReducedMotion
├─ types/                    Compléments de types (session Auth.js)
└─ lib/                      Logique serveur, par domaine
   ├─ auth/                  viewer (personne connectée), fournisseurs OAuth, redirections sûres
   ├─ security/              limites de tentatives, lecture JSON bornée
   ├─ db/                    connexion PostgreSQL (pg ou PGlite) et migrations
   ├─ users/                 comptes e-mail, pseudos, anonymat, codes et vérification
   ├─ email/                 envoi SMTP et gabarits des e-mails
   ├─ discord/               annonces Discord, photos de profil, liaison OAuth
   ├─ proposals/             propositions : schémas, stockage, compteurs
   ├─ research/              papiers de recherche : droits, fichiers, likes, stockage
   ├─ books/                 books : stockage, simulation, stratégies, accueil
   ├─ admin/ account/        rôles, bannissements, vue d'ensemble du compte
   ├─ i18n/                  français / anglais
   └─ shared/                format des nombres, aléatoire déterministe, cn()
```

## Modifier le contenu

Tous les chiffres affichés (books, compteurs de stratégies, contrôles du script de test, progression du bot) sont dans [`src/content/home.ts`](src/content/home.ts). **Ce sont des exemples simulés** : remplace-les par les vrais résultats avant diffusion.

La courbe « Sharpe du bot à chaque stratégie ajoutée » lit `improvementSteps` : ajoute une ligne à chaque stratégie intégrée pour montrer la progression du bot.

## Base de données

Tout est dans PostgreSQL : comptes, propositions, groupes de recherche, membres, publications et **contenu des pièces jointes** (une seule sauvegarde suffit).

| Table | Contenu |
| --- | --- |
| `users` | comptes e-mail (mot de passe haché scrypt) |
| `proposals` | propositions de stratégies |
| `research_groups`, `research_members`, `research_posts`, `research_attachments` | recherches ; supprimer un groupe supprime tout ce qu'il contient |
| `rate_limits` | compteurs des limites de tentatives |
| `schema_migrations` | versions du schéma déjà appliquées |

- Connexion : [`src/lib/db/index.ts`](src/lib/db/index.ts). Toutes les requêtes sont paramétrées (`$1`, `$2`…), jamais construites par concaténation.
- Schéma : [`src/lib/db/migrations.ts`](src/lib/db/migrations.ts), appliqué automatiquement au démarrage. Pour le faire évoluer, **ajoute** une migration à la fin de la liste ; ne modifie jamais une migration déjà déployée.
- Les pages passent par les dépôts (`getUserRepository`, `getProposalRepository`, `getResearchRepository`) et ne touchent jamais au SQL.

## Sécurité

- **Connexion** : 10 essais par compte et 30 par adresse IP toutes les 15 minutes, puis « Trop de tentatives ». Un e-mail inconnu prend le même temps qu'un mauvais mot de passe : on ne peut pas deviner qui a un compte. Inscription : 5 par heure et par IP.
- **Envois** : 10 propositions, 30 publications et 10 groupes par heure et par compte. Un fichier `.pdf` doit vraiment être un PDF.
- **Session** : JWT signé dans un cookie `HttpOnly`, `SameSite=Lax` (`Secure` en HTTPS), valable 14 jours.
- **En-têtes** ([`next.config.ts`](next.config.ts)) : politique de contenu (CSP) qui n'autorise que les ressources du site, interdiction d'afficher le site dans une iframe, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- **Droits** : revérifiés côté serveur dans chaque action et dans la route de téléchargement.

## Hébergement (VPS)

Le site tourne sur un VPS Ubuntu (accès `ssh griffin`, par clé uniquement) :

| Élément | Où |
| --- | --- |
| Code | `/srv/griffin-lab`, service systemd `griffin-lab` (`sudo systemctl restart griffin-lab`, journaux : `journalctl -u griffin-lab`) |
| Secrets | `/etc/griffin-lab.env` (lisible par root et le service seulement) |
| Base | PostgreSQL, base `griffin`, n'écoute que sur `127.0.0.1` |
| Sauvegardes | chaque nuit dans `/var/backups/griffin-lab` (14 jours), plus la sauvegarde quotidienne de l'hébergeur |
| Nginx | `/etc/nginx/sites-available/griffin-lab` : HTTP redirigé vers HTTPS, HSTS, proxy vers le port 3000, envois jusqu'à 52 Mo, 20 requêtes/s par IP |
| HTTPS | certificat Let's Encrypt pour l'adresse IP (`certbot`, nom `griffin-ip`, profil court d'environ 6 jours, renouvelé automatiquement). Avec un nom de domaine : `certbot certonly --webroot -w /var/www/certbot -d ton-domaine`, puis changer les chemins du certificat et `AUTH_URL`. |
| Pare-feu | ufw : SSH, HTTP, HTTPS uniquement ; fail2ban sur SSH ; mises à jour de sécurité automatiques |

Mettre à jour le site : envoyer le code dans `/srv/griffin-lab` (sans `node_modules`, `.next`, `data`, `.env*`), puis `npm ci && npx next build` avec les variables de `/etc/griffin-lab.env`, et redémarrer le service.

## Comptes

La connexion passe par [Auth.js](https://authjs.dev), configuré dans [`src/auth.ts`](src/auth.ts). Les sessions sont des JWT signés avec `AUTH_SECRET` (cookie), sans table de sessions.

- **E-mail + mot de passe** : inscription et connexion sur `/sign-in`. Les mots de passe sont hachés avec scrypt ([`src/lib/users/password.ts`](src/lib/users/password.ts)) et stockés dans la table `users` ([`src/lib/users/repository.ts`](src/lib/users/repository.ts)).
- **Vérification de l'adresse** : à l'inscription (et seulement à ce moment-là), un e-mail contient un lien vers `/verify` ; un bouton y confirme l'adresse (lien valable 24 h, à usage unique, seule son empreinte est en base). Tant que l'adresse n'est pas confirmée, la connexion est refusée et propose « Renvoyer l'e-mail de confirmation ». Code : [`src/lib/users/verification.ts`](src/lib/users/verification.ts), envoi : [`src/lib/email/mailer.ts`](src/lib/email/mailer.ts).
- **Pseudo** : unique (sans tenir compte des majuscules), 3 à 24 caractères, table `profiles`. Choisi à l'inscription par e-mail ; après une première connexion Discord ou Google, la personne passe par `/welcome` pour le choisir. On peut en changer depuis `/account`. Proposer, créer un groupe ou publier exige un pseudo.
- **Discord, Google** : un bouton n'est actif que si ses deux variables sont définies. Chez chaque fournisseur, déclare l'URL de retour `https://<ton-domaine>/api/auth/callback/<discord|google>` (en local : `http://localhost:3000/api/auth/callback/discord`, etc.).
- L'en-tête lit la session côté serveur (dans `layout.tsx`). Déconnecté, « Se connecter » mène à `/sign-in` ; connecté, l'avatar (vers `/account`) apparaît et « Proposer » mène directement au formulaire.
- `/submit` exige un compte : sans session, redirection vers la connexion, puis retour au formulaire. Seuls les chemins internes sont acceptés comme destination (`src/lib/auth/safe-redirect.ts`).

### Administration

Un compte dont l'e-mail figure dans `ADMIN_EMAILS` voit un bouton « Administration » sur `/account`. La page `/admin` (404 pour tout autre visiteur) permet de :

- voir les chiffres clés (comptes, propositions en attente, groupes, publications) ;
- chercher un compte, le **bannir** (avec une raison ; réversible, ses contenus restent, toute connexion est refusée) ou le **supprimer** (définitif : ses propositions, les groupes qu'il a créés, ses publications et son pseudo sont effacés) ;
- supprimer n'importe quel groupe de recherche ;
- ouvrir `/moderation` sans jeton : statut, score, raison, et suppression des propositions.

Dans les groupes, un administrateur peut tout lire, modifier et supprimer (publications, membres, fichiers). Un administrateur ne peut ni se bannir ni bannir ou supprimer un autre administrateur. Code : [`src/app/admin`](src/app/admin), [`src/lib/admin/repository.ts`](src/lib/admin/repository.ts).

Note : après l'ajout de Tailwind (`postcss.config.mjs`), si les classes Tailwind n'apparaissent pas en local, supprime le dossier `.next` et relance `npm run dev`.

## Propositions et comptes

Chaque proposition est rattachée au compte qui l'a envoyée (`authorId` = « fournisseur:identifiant », voir [`src/lib/proposals/author.ts`](src/lib/proposals/author.ts)).

| Appel | Accès |
| --- | --- |
| `GET /api/proposals` | sans session : 401 ; connecté : **uniquement ses propres propositions** ; avec `Authorization: Bearer <ADMIN_TOKEN>` : toutes (page `/moderation`). |
| `POST /api/proposals` | connecté uniquement ; le pseudo vide prend le nom du compte. |
| `PATCH /api/proposals/:id` | jeton de modération uniquement. |

Le code des stratégies et l'identifiant de l'auteur ne sont jamais renvoyés par l'API. Les propositions créées avant cette version n'ont pas d'auteur : elles ne sont visibles que depuis la modération.

## Recherches

`/research` réunit deux types de papiers de recherche :

- **Recherches Griffin Lab** : créées par l'équipe. Les rôles Équipe, Admin et le super admin peuvent lire et publier dans **tous** ces papiers, quel que soit leur propriétaire.
- **Communauté** : tout compte connecté peut créer un papier (« Créer un papier de recherche ») et y partager ses recherches.

Un groupe fonctionne comme un blog : des publications (titre, texte, lien) avec jusqu'à 5 pièces jointes de 10 Mo (PDF, scripts `.py` `.pine` `.r` `.m` `.jl` `.js` `.ts` `.txt` `.md`, notebooks `.ipynb`, données `.csv` `.json` `.xlsx` `.parquet`).

| Rôle | Lire | Publier et supprimer | Membres, réglages, suppression du groupe |
| --- | --- | --- | --- |
| Propriétaire | oui | oui | oui |
| Membre « Peut publier » | oui | oui | non |
| Membre « Lecture seule » | oui | non | non |
| Autres | si le groupe est public | non | non |

Les membres sont invités par l'e-mail de leur compte. Un groupe privé (et ses fichiers) renvoie 404 à qui n'en est pas membre. Les droits sont revérifiés dans chaque action serveur ([`src/app/research/actions.ts`](src/app/research/actions.ts)) et dans la route de téléchargement ; les règles sont dans [`src/lib/research/access.ts`](src/lib/research/access.ts).

Les scripts sont servis en texte brut et en téléchargement (`X-Content-Type-Options: nosniff`), jamais exécutés.

Les PDF se lisent dans l'appli, sans quitter le site :

- sur la liste, les 3 derniers PDF d'un groupe dépassent de sa carte, en éventail ; un clic ouvre le lecteur ;
- dans une publication, le dossier animé (`ImagesBadge`) montre les premières pages et ouvre le lecteur.

Le lecteur ([`PdfViewer`](src/components/research/PdfViewer.tsx)) dessine les pages avec [pdf.js](https://mozilla.github.io/pdf.js/) au fil du défilement, ce qui marche aussi sur mobile (où les navigateurs n'affichent pas les PDF en iframe). Les miniatures sont la première page, générée dans le navigateur ([`pdf-client.ts`](src/lib/research/pdf-client.ts)) ; une page stylisée s'affiche en attendant ou si le fichier ne se lit pas.

Le stockage (`ResearchRepository`, [`src/lib/research/repository.ts`](src/lib/research/repository.ts)) écrit dans les tables `research_*`, fichiers compris. Il n'y a pas d'analyse antivirus des pièces jointes : les scripts ne sont jamais exécutés par le site.

**Likes** : un compte avec pseudo peut aimer une publication qu'il a le droit de lire (un like par compte, table `post_likes`). Le total reçu s'affiche sur le profil de l'auteur.

## Books

`/books` (lien « Books » dans la navigation) : des cercles privés créés par l'équipe Griffin Lab (`RESEARCH_TEAM_EMAILS` et `ADMIN_EMAILS`).

- **Colonne de gauche, rétractable** : la liste des books (rond de la couleur du book, cadenas pour un visiteur non connecté), l'interrupteur « Afficher les recherches » et, pour l'équipe, « Nouveau book » et « Gérer ce book » (nom, description, couleur, ajout d'un membre par son pseudo, retrait, suppression).
- **Canevas** : chaque book a le sien, séparé des autres. Le book est un rond de sa couleur au centre, ses membres sont reliés autour. Molette, pincement ou boutons + / − pour zoomer, glisser pour se déplacer, ⛶ (ou la touche 0) pour recentrer. Avec « Afficher les recherches », chaque membre est relié aux groupes de recherche où il a publié (seulement ceux que la personne qui regarde peut lire).
- **Accès** : tout compte connecté voit tous les books (canevas, membres, chiffres) ; un visiteur lit « Connecte-toi pour voir ce book. ». Être membre d'un book compte pour l'anonymat : un profil « Anonyme hors de mes books » n'est nommé que pour les membres d'un book qu'il partage, les autres voient « Anonyme ». La photo de profil Discord suit la même règle : elle n'est jamais envoyée à qui ne peut pas voir le pseudo.
- Un clic sur une personne ouvre son profil `/members/<pseudo>` : les recherches auxquelles elle a contribué, les likes reçus et les books dont elle est membre.

**Simulation des books** ([`src/lib/books/simulation.ts`](src/lib/books/simulation.ts)) : chaque book qui a des chiffres est simulé comme un vrai portefeuille, avec une valeur par heure dans la table `book_ticks` (base 100, rendement horaire aléatoire autour d'une tendance qui vise le « rendement visé sur 30 j » du book, rappel vers la cible). Pas de tâche planifiée : à chaque lecture, les heures manquantes sont générées (30 jours d'historique la première fois). Le « Mois » affiché est le rendement sur 30 jours glissants ; la courbe « Rendement · semaine » montre les 7 derniers jours, verte au-dessus de 0 % et rouge en perte. Books A, B, C visent 22,2 %, 15,3 % et 11,4 %. L'accueil est rendu à chaque visite (il lit la base), donc les chiffres changent dès qu'une nouvelle heure est générée.

**Anonymat** (sur `/account`) : *Public* (pseudo et profil visibles par tous), *Anonyme hors de mes books* (visibles seulement par les personnes qui partagent un book avec toi) ou *Anonyme pour tout le monde*. Une personne masquée apparaît comme « Anonyme », sans lien, dans les canevas, sur les publications et dans la liste des groupes ; son profil renvoie 404. Elle-même, l'équipe et les administrateurs voient toujours son pseudo (avec la mention « masqué »). Code : [`src/lib/users/identity.ts`](src/lib/users/identity.ts), [`src/lib/books/repository.ts`](src/lib/books/repository.ts), [`src/components/books`](src/components/books).

**Photos de profil** : la photo Discord d'un membre s'affiche dans son rond. Un compte Discord l'a automatiquement ; un compte e-mail ou Google peut lier son Discord sur `/account` (« Lier Discord », autorisation `identify` seulement). On ne garde que l'identifiant Discord et l'empreinte de la photo (table `discord_links`), l'image est servie par Discord. Déclarer `https://<ton-domaine>/api/discord/link/callback` dans le portail Discord (OAuth2 → Redirects). Code : [`src/lib/discord`](src/lib/discord).

## Discord

Le site envoie lui-même, avec `DISCORD_BOT_TOKEN`, des messages anonymes au serveur Discord : nouvelle recherche publique dans #research, statut d'une proposition (en file, acceptée, refusée) et compteur dans #strategy-ideas ([`src/lib/discord/announce.ts`](src/lib/discord/announce.ts)). Le bot permanent (accueil, rendements quotidiens) et les outils de construction du serveur sont dans le dossier [`discord/`](../discord) à la racine du dépôt.
