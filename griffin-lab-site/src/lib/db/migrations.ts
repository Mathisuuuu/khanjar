import "server-only";
import type { Database } from "./index";

/**
 * Schéma de la base, par versions successives. Chaque migration s'exécute une
 * seule fois, dans une transaction, au premier accès à la base.
 * Pour faire évoluer le schéma : ajoute une migration à la fin, ne modifie
 * jamais une migration déjà déployée.
 */
const MIGRATIONS: string[] = [
  /* 1 : comptes, propositions, recherches, limites de tentatives */ `
  CREATE TABLE users (
    id            uuid PRIMARY KEY,
    email         text NOT NULL UNIQUE CHECK (email = lower(email)),
    name          text NOT NULL,
    password_hash text NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE proposals (
    id            uuid PRIMARY KEY,
    author_id     text NOT NULL,
    type          text NOT NULL CHECK (type IN ('idea', 'script', 'paper')),
    pseudo        text NOT NULL,
    market        text NOT NULL,
    title         text NOT NULL,
    description   text NOT NULL,
    code          text,
    paper_title   text,
    paper_authors text,
    paper_url     text,
    status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'testing', 'validated', 'rejected')),
    score         integer CHECK (score BETWEEN 0 AND 100),
    reason        text,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX proposals_author_idx ON proposals (author_id, created_at DESC);

  CREATE TABLE research_groups (
    id          uuid PRIMARY KEY,
    name        text NOT NULL,
    description text NOT NULL,
    kind        text NOT NULL CHECK (kind IN ('official', 'community')),
    visibility  text NOT NULL CHECK (visibility IN ('public', 'private')),
    owner_id    text NOT NULL,
    owner_name  text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE research_members (
    group_id uuid NOT NULL REFERENCES research_groups (id) ON DELETE CASCADE,
    email    text NOT NULL CHECK (email = lower(email)),
    role     text NOT NULL CHECK (role IN ('editor', 'viewer')),
    added_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (group_id, email)
  );
  CREATE INDEX research_members_email_idx ON research_members (email);

  CREATE TABLE research_posts (
    id          uuid PRIMARY KEY,
    group_id    uuid NOT NULL REFERENCES research_groups (id) ON DELETE CASCADE,
    author_id   text NOT NULL,
    author_name text NOT NULL,
    title       text NOT NULL,
    body        text NOT NULL,
    link        text,
    created_at  timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX research_posts_group_idx ON research_posts (group_id, created_at DESC);

  -- le contenu des fichiers est dans la base : une seule sauvegarde suffit
  CREATE TABLE research_attachments (
    id       uuid PRIMARY KEY,
    post_id  uuid NOT NULL REFERENCES research_posts (id) ON DELETE CASCADE,
    position integer NOT NULL,
    name     text NOT NULL,
    size     integer NOT NULL,
    mime     text NOT NULL,
    kind     text NOT NULL CHECK (kind IN ('pdf', 'script', 'notebook', 'data')),
    data     bytea NOT NULL
  );
  CREATE INDEX research_attachments_post_idx ON research_attachments (post_id, position);

  CREATE TABLE rate_limits (
    key      text PRIMARY KEY,
    hits     integer NOT NULL,
    reset_at timestamptz NOT NULL
  );
  `,

  /* 2 : vérification des e-mails, pseudos de tous les comptes */ `
  ALTER TABLE users ADD COLUMN email_verified_at timestamptz;
  -- les comptes créés avant la vérification sont considérés comme vérifiés
  UPDATE users SET email_verified_at = created_at;

  -- on ne garde que l'empreinte (sha256) du jeton envoyé par e-mail
  CREATE TABLE email_tokens (
    token_hash text PRIMARY KEY,
    user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    purpose    text NOT NULL CHECK (purpose IN ('verify')),
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX email_tokens_user_idx ON email_tokens (user_id, purpose);

  -- pseudo affiché, pour tous les comptes (« fournisseur:identifiant »), unique sans tenir compte des majuscules
  CREATE TABLE profiles (
    user_key   text PRIMARY KEY,
    pseudo     text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE UNIQUE INDEX profiles_pseudo_idx ON profiles (lower(pseudo));

  INSERT INTO profiles (user_key, pseudo, created_at, updated_at)
  SELECT 'credentials:' || id, name, created_at, created_at FROM users
  ON CONFLICT DO NOTHING;
  `,

  /* 3 : comptes bannis par un administrateur */ `
  CREATE TABLE banned_accounts (
    user_key  text PRIMARY KEY,
    pseudo    text,
    reason    text NOT NULL DEFAULT '',
    banned_by text NOT NULL,
    banned_at timestamptz NOT NULL DEFAULT now()
  );
  `,

  /* 4 : books, likes des publications, visibilité des profils */ `
  -- public : nom et profil visibles par tous ; books : seulement par les personnes
  -- qui partagent un book avec la personne ; anonymous : par personne
  ALTER TABLE profiles ADD COLUMN visibility text NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'books', 'anonymous'));

  CREATE TABLE books (
    id          uuid PRIMARY KEY,
    name        text NOT NULL,
    description text NOT NULL DEFAULT '',
    color       text NOT NULL CHECK (color ~ '^#[0-9a-f]{6}$'),
    created_by  text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE book_members (
    book_id  uuid NOT NULL REFERENCES books (id) ON DELETE CASCADE,
    user_key text NOT NULL,
    added_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (book_id, user_key)
  );
  CREATE INDEX book_members_user_idx ON book_members (user_key);

  CREATE TABLE post_likes (
    post_id    uuid NOT NULL REFERENCES research_posts (id) ON DELETE CASCADE,
    user_key   text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (post_id, user_key)
  );
  CREATE INDEX post_likes_user_idx ON post_likes (user_key);
  `,

  /* 5 : chiffres des books (ceux de l'accueil), Books A, B, C et leurs contributeurs */ `
  ALTER TABLE books ADD COLUMN letter text UNIQUE;
  ALTER TABLE books ADD COLUMN strategies integer;
  ALTER TABLE books ADD COLUMN sharpe numeric(6, 2);
  ALTER TABLE books ADD COLUMN max_drawdown numeric(6, 2);
  ALTER TABLE books ADD COLUMN month_return numeric(6, 2);

  INSERT INTO books (id, letter, name, description, color, strategies, sharpe, max_drawdown, month_return, created_by) VALUES
    ('0b0a0000-0000-4000-8000-00000000000a', 'A', 'Book A', 'La boucle principale du bot.', '#38bdf8', 6, 1.84, -8.1, 7.4, 'system'),
    ('0b0a0000-0000-4000-8000-00000000000b', 'B', 'Book B', 'Stratégies peu corrélées au Book A.', '#a855f7', 5, 1.41, -6.7, 5.1, 'system'),
    ('0b0a0000-0000-4000-8000-00000000000c', 'C', 'Book C', 'Retour à la moyenne et volatilité.', '#f5b524', 3, 1.22, -5.4, 3.8, 'system')
  ON CONFLICT DO NOTHING;

  -- un contributeur par stratégie validée (6 + 5 + 3) ; comptes de démonstration
  -- (fournisseur « demo » : aucune connexion possible), un quart anonymes
  INSERT INTO profiles (user_key, pseudo, visibility) VALUES
    ('demo:kairos', 'Kairos_Quant', 'public'),
    ('demo:lea', 'Lea_Momentum', 'public'),
    ('demo:nqhunter', 'NQ_Hunter', 'public'),
    ('demo:theo', 'Theo.Vol', 'anonymous'),
    ('demo:mira', 'Mira_Alpha', 'public'),
    ('demo:baptiste', 'Baptiste_FX', 'books'),
    ('demo:sami', 'Sami_Arb', 'public'),
    ('demo:ines', 'Ines_Delta', 'books'),
    ('demo:orion', 'Orion_Stat', 'public'),
    ('demo:hugo', 'Hugo_Breakout', 'public'),
    ('demo:zoe', 'Zoe.Carry', 'public'),
    ('demo:nadia', 'Nadia_MeanRev', 'public'),
    ('demo:victor', 'Victor_Gamma', 'anonymous'),
    ('demo:elio', 'Elio_Ticks', 'anonymous')
  ON CONFLICT DO NOTHING;

  INSERT INTO book_members (book_id, user_key) VALUES
    ('0b0a0000-0000-4000-8000-00000000000a', 'demo:kairos'),
    ('0b0a0000-0000-4000-8000-00000000000a', 'demo:lea'),
    ('0b0a0000-0000-4000-8000-00000000000a', 'demo:nqhunter'),
    ('0b0a0000-0000-4000-8000-00000000000a', 'demo:theo'),
    ('0b0a0000-0000-4000-8000-00000000000a', 'demo:mira'),
    ('0b0a0000-0000-4000-8000-00000000000a', 'demo:baptiste'),
    ('0b0a0000-0000-4000-8000-00000000000b', 'demo:sami'),
    ('0b0a0000-0000-4000-8000-00000000000b', 'demo:ines'),
    ('0b0a0000-0000-4000-8000-00000000000b', 'demo:orion'),
    ('0b0a0000-0000-4000-8000-00000000000b', 'demo:hugo'),
    ('0b0a0000-0000-4000-8000-00000000000b', 'demo:zoe'),
    ('0b0a0000-0000-4000-8000-00000000000c', 'demo:nadia'),
    ('0b0a0000-0000-4000-8000-00000000000c', 'demo:victor'),
    ('0b0a0000-0000-4000-8000-00000000000c', 'demo:elio')
  ON CONFLICT DO NOTHING;
  `,

  /* 6 : simulation horaire des books (valeur du portefeuille, une ligne par heure) */ `
  -- month_return devient le rendement visé sur 30 jours (trois fois l'ancien chiffre) ;
  -- le rendement affiché est calculé à partir de book_ticks
  UPDATE books SET month_return = month_return * 3 WHERE letter IN ('A', 'B', 'C');

  CREATE TABLE book_ticks (
    book_id uuid NOT NULL REFERENCES books (id) ON DELETE CASCADE,
    at      timestamptz NOT NULL,
    equity  double precision NOT NULL,
    PRIMARY KEY (book_id, at)
  );
  `,

  /* 7 : code de vérification à 6 chiffres (en plus du lien), avec compteur d'essais */ `
  ALTER TABLE email_tokens DROP CONSTRAINT IF EXISTS email_tokens_purpose_check;
  ALTER TABLE email_tokens ADD CONSTRAINT email_tokens_purpose_check CHECK (purpose IN ('verify', 'verify_code'));
  ALTER TABLE email_tokens ADD COLUMN attempts integer NOT NULL DEFAULT 0;
  `,

  /* 8 : mot de passe oublié (code et lien de réinitialisation) */ `
  ALTER TABLE email_tokens DROP CONSTRAINT IF EXISTS email_tokens_purpose_check;
  ALTER TABLE email_tokens ADD CONSTRAINT email_tokens_purpose_check
    CHECK (purpose IN ('verify', 'verify_code', 'reset', 'reset_code'));
  `,

  /* 9 : « boucle » devient « book » dans les textes */ `
  UPDATE books SET description = 'Le book principal du bot.'
    WHERE letter = 'A' AND description = 'La boucle principale du bot.';
  `,

  /* 10 : publications façon article (surtitre, chapô) et modification */ `
  ALTER TABLE research_posts ADD COLUMN IF NOT EXISTS category text;
  ALTER TABLE research_posts ADD COLUMN IF NOT EXISTS summary text;
  ALTER TABLE research_posts ADD COLUMN IF NOT EXISTS updated_at timestamptz;
  `,

  /* 11 : contenu des books (la stratégie apportée par chaque membre, ses fichiers) */ `
  CREATE TABLE book_strategies (
    id          uuid PRIMARY KEY,
    book_id     uuid NOT NULL REFERENCES books (id) ON DELETE CASCADE,
    user_key    text NOT NULL,
    proposal_id uuid REFERENCES proposals (id) ON DELETE SET NULL,
    title       text NOT NULL,
    market      text NOT NULL DEFAULT '',
    summary     text NOT NULL DEFAULT '',
    report      text NOT NULL DEFAULT '',
    updated_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (book_id, user_key)
  );

  CREATE TABLE book_strategy_files (
    id          uuid PRIMARY KEY,
    strategy_id uuid NOT NULL REFERENCES book_strategies (id) ON DELETE CASCADE,
    position    integer NOT NULL,
    name        text NOT NULL,
    size        integer NOT NULL,
    mime        text NOT NULL,
    kind        text NOT NULL CHECK (kind IN ('pdf', 'script', 'notebook', 'data')),
    data        bytea NOT NULL
  );
  CREATE INDEX book_strategy_files_idx ON book_strategy_files (strategy_id, position);
  `,

  /* 12 : voir les stratégies des autres membres d'un book, sur autorisation d'un administrateur (non par défaut) */ `
  ALTER TABLE book_members ADD COLUMN IF NOT EXISTS can_view_strategies boolean NOT NULL DEFAULT false;
  `,
];

export async function migrate(db: Database): Promise<void> {
  await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version    integer PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const rows = await db.query<{ version: number }>("SELECT coalesce(max(version), 0) AS version FROM schema_migrations");
  const current = Number(rows[0]?.version ?? 0);

  for (let version = current + 1; version <= MIGRATIONS.length; version++) {
    await db.transaction(async (tx) => {
      // verrou : deux processus démarrés en même temps n'appliquent pas la même migration
      await tx.query("LOCK TABLE schema_migrations IN EXCLUSIVE MODE");
      const done = await tx.query("SELECT 1 FROM schema_migrations WHERE version = $1", [version]);
      if (done.length > 0) return;
      for (const statement of splitStatements(MIGRATIONS[version - 1])) await tx.query(statement);
      await tx.query("INSERT INTO schema_migrations (version) VALUES ($1)", [version]);
    });
  }
}

/** Une requête paramétrée n'accepte qu'une instruction : on découpe sur les « ; » de fin de ligne. */
function splitStatements(sql: string): string[] {
  return sql
    .replace(/--.*$/gm, "")
    .split(/;\s*$/m)
    .map((statement) => statement.trim())
    .filter(Boolean);
}
