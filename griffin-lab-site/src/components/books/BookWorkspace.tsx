"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import {
  addBookMemberAction,
  createBookAction,
  deleteBookAction,
  removeBookMemberAction,
  setStrategyAccessAction,
  updateBookAction,
  type BookFormState,
} from "@/app/books/actions";
import { Button } from "@/components/ui/Button";
import { BookCanvas } from "./BookCanvas";
import { BookContents } from "./BookContents";
import styles from "./Books.module.css";
import type { BookListItem, EditableBook, ManagedMember, SelectedBook } from "./types";

type Props = {
  books: BookListItem[];
  selected: SelectedBook | null;
  team: boolean;
  /** administrateur : peut autoriser un membre à voir les stratégies */
  admin: boolean;
  signedIn: boolean;
  managed: ManagedMember[];
  editable: EditableBook | null;
};

const RESEARCH_KEY = "griffin-lab:books-recherches";

const STAT_FIELDS = [
  { name: "monthReturn", label: "Rendement visé sur 30 j (%)", hint: "22,2" },
  { name: "sharpe", label: "Sharpe", hint: "1,84" },
  { name: "maxDrawdown", label: "Drawdown max (%)", hint: "-8,1" },
  { name: "strategies", label: "Stratégies", hint: "6" },
] as const;

const formatReturn = (value: number) =>
  `${value > 0 ? "+" : ""}${value.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;

const PALETTE = ["#22c55e", "#38bdf8", "#a855f7", "#f5b524", "#ef4444", "#ec4899", "#14b8a6", "#f97316"];

function readFlag(key: string): boolean | null {
  try {
    const value = localStorage.getItem(key);
    return value === null ? null : value === "1";
  } catch {
    return null;
  }
}
function writeFlag(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // stockage indisponible
  }
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" className={styles.lock}>
      <rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/** Espace Books : colonne rétractable à gauche (liste, options, gestion) et canevas du book choisi. */
export function BookWorkspace({ books, selected, team, admin, signedIn, managed, editable }: Props) {
  // les deux panneaux (colonne de gauche, contenu du book) démarrent fermés
  const [open, setOpen] = useState(false);
  const [showResearch, setShowResearch] = useState(false);
  const [contentsOpen, setContentsOpen] = useState(false);
  useEffect(() => setContentsOpen(false), [selected?.id]);

  useEffect(() => {
    setShowResearch(readFlag(RESEARCH_KEY) ?? false);
  }, []);

  const toggleSidebar = () => setOpen((value) => !value);

  return (
    <div className={`${styles.workspace} ${open ? styles.open : styles.closed}`}>
      <aside className={styles.sidebar} aria-label="Books">
        <div className={styles.sideHead}>
          {open && <h1 className={styles.sideTitle}>Books</h1>}
          <button
            type="button"
            className={styles.collapse}
            onClick={toggleSidebar}
            aria-expanded={open}
            aria-label={open ? "Replier la colonne" : "Déplier la colonne"}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d={open ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <nav aria-label="Liste des books" className={styles.bookNav}>
          {books.length === 0 && open && <p className={styles.sideNote}>Aucun book pour l&apos;instant.</p>}
          <ul className={styles.bookList}>
            {books.map((book) => (
              <li key={book.id}>
                <Link
                  href={`/books/${book.id}`}
                  className={styles.bookItem}
                  aria-current={selected?.id === book.id ? "page" : undefined}
                  title={`${book.name}${book.monthReturn !== null ? ` · ${formatReturn(book.monthReturn)} ce mois` : ""}${book.locked ? " (connexion requise)" : book.member ? " · tu en fais partie" : ""}`}
                >
                  <span className={styles.dot} style={{ background: book.color }} aria-hidden="true" />
                  {open && <span className={styles.bookName}>{book.name}</span>}
                  {open && book.locked && <LockIcon />}
                  {!open && <span className="visually-hidden">{book.name}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {open && (
          <div className={styles.sideSections}>
            <label className={styles.switch}>
              <input
                type="checkbox"
                checked={showResearch}
                onChange={(event) => {
                  setShowResearch(event.target.checked);
                  writeFlag(RESEARCH_KEY, event.target.checked);
                }}
              />
              <span className={styles.switchTrack} aria-hidden="true" />
              <span>
                Afficher les recherches
                <small>Relie chaque membre aux recherches où il a publié.</small>
              </span>
            </label>

            {team && <NewBookForm />}
            {team && selected?.access && editable && (
              <ManageBook key={selected.id} bookId={selected.id} editable={editable} members={managed} admin={admin} />
            )}
          </div>
        )}
      </aside>

      <section className={styles.stage} aria-live="polite">
        {!selected && (
          <div className={styles.message}>
            <b>{books.length ? "Choisis un book dans la colonne de gauche." : "Aucun book pour l'instant."}</b>
            {team && !books.length && <span>Crée le premier avec « Nouveau book ».</span>}
            {!signedIn && <span>Connecte-toi pour voir les books.</span>}
          </div>
        )}

        {selected && !selected.access && (
          <div className={styles.message}>
            <span className={styles.ring} style={{ borderColor: selected.color }} aria-hidden="true">
              <LockIcon />
            </span>
            <b>{selected.name}</b>
            <span>Connecte-toi pour voir ce book.</span>
            {!signedIn && (
              <Button href={`/connexion?callbackUrl=/books/${selected.id}`} size="sm" variant="glass">
                Se connecter
              </Button>
            )}
          </div>
        )}

        {selected?.access && (
          <>
            <BookCanvas
              name={selected.name}
              color={selected.color}
              members={selected.members}
              groups={selected.groups}
              links={selected.links}
              showResearch={showResearch}
              stats={selected.stats}
            />
            <div className={styles.caption}>
              <h2>
                <span className={styles.dot} style={{ background: selected.color }} aria-hidden="true" />
                {selected.name}
              </h2>
              {selected.description && <p>{selected.description}</p>}
              <p className={styles.captionMeta}>
                {selected.members.length} membre{selected.members.length > 1 ? "s" : ""}
                {showResearch && ` · ${selected.groups.length} recherche${selected.groups.length > 1 ? "s" : ""}`}
              </p>
              <details className={styles.memberList}>
                <summary>Liste des membres</summary>
                <ul>
                  {selected.members.map((m) => (
                    <li key={m.id}>
                      {m.href ? <Link href={m.href}>{m.name}</Link> : <span>{m.name}</span>}
                      {m.self && " (toi)"}
                    </li>
                  ))}
                </ul>
              </details>
            </div>
            {contentsOpen ? (
              <BookContents
                key={selected.id}
                bookId={selected.id}
                name={selected.name}
                color={selected.color}
                description={selected.description}
                stats={selected.stats}
                memberCount={selected.members.length}
                contents={selected.contents}
                onClose={() => setContentsOpen(false)}
              />
            ) : (
              <button type="button" className={styles.contentsOpen} onClick={() => setContentsOpen(true)}>
                {selected.contents.access ? "Voir le contenu du book" : "Contenu du book"}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function ColorField({ initial, error }: { initial: string; error?: string }) {
  const [color, setColor] = useState(initial);
  return (
    <fieldset className={styles.field}>
      <legend>Couleur</legend>
      <div className={styles.swatches}>
        {PALETTE.map((swatch) => (
          <button
            key={swatch}
            type="button"
            className={styles.swatch}
            style={{ background: swatch }}
            aria-label={`Couleur ${swatch}`}
            aria-pressed={color === swatch}
            onClick={() => setColor(swatch)}
          />
        ))}
        <input type="color" name="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Autre couleur" />
      </div>
      {error && <small className={styles.error}>{error}</small>}
    </fieldset>
  );
}

function BookFields({
  state,
  initial,
  withStats = false,
}: {
  state: BookFormState;
  initial: { name: string; description: string; color: string } & Partial<EditableBook>;
  withStats?: boolean;
}) {
  const errors = state.fieldErrors ?? {};
  return (
    <>
      <label className={styles.field}>
        <span>Nom</span>
        <input name="name" required maxLength={60} defaultValue={state.values?.name ?? initial.name} aria-invalid={!!errors.name} />
        {errors.name && <small className={styles.error}>{errors.name}</small>}
      </label>
      <label className={styles.field}>
        <span>Description</span>
        <textarea name="description" maxLength={300} rows={2} defaultValue={state.values?.description ?? initial.description} />
        {errors.description && <small className={styles.error}>{errors.description}</small>}
      </label>
      <ColorField initial={state.values?.color ?? initial.color} error={errors.color} />
      {withStats && (
        <fieldset className={styles.field}>
          <legend>Chiffres (accueil et survol)</legend>
          <div className={styles.statsGrid}>
            {STAT_FIELDS.map(({ name, label, hint }) => (
              <label key={name} className={styles.field}>
                <span>{label}</span>
                <input
                  name={name}
                  inputMode="decimal"
                  placeholder={hint}
                  defaultValue={state.values?.[name] ?? initial[name] ?? ""}
                  aria-invalid={!!errors[name]}
                />
                {errors[name] && <small className={styles.error}>{errors[name]}</small>}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {state.message && <p className={state.ok ? styles.ok : styles.error}>{state.message}</p>}
    </>
  );
}

function NewBookForm() {
  const [state, action, pending] = useActionState(createBookAction, {});
  return (
    <details className={styles.sideBlock}>
      <summary>Nouveau book</summary>
      <form action={action} className={styles.form}>
        <BookFields state={state} initial={{ name: "", description: "", color: PALETTE[0] }} />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "…" : "Créer le book"}
        </Button>
      </form>
    </details>
  );
}

/**
 * Un membre dans « Gérer ce book » : nom, puis (admin) l'interrupteur
 * « Voir les stratégies » et le bouton Retirer. L'interrupteur change tout de
 * suite à l'écran ; il revient en arrière si le serveur refuse.
 */
function ManagedRow({ bookId, member, admin }: { bookId: string; member: ManagedMember; admin: boolean }) {
  const [canView, setCanView] = useState(member.canView);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  useEffect(() => setCanView(member.canView), [member.canView]);

  const toggle = () => {
    const next = !canView;
    setCanView(next);
    setError("");
    startTransition(async () => {
      const result = await setStrategyAccessAction(bookId, member.userKey, next);
      if (!result.ok) {
        setCanView(!next);
        setError(result.message ?? "Échec, réessaie.");
      }
    });
  };

  return (
    <li className={styles.managedRow}>
      <span className={styles.managedName}>
        {member.name}
        {member.masked && <small> · masqué</small>}
      </span>
      <div className={styles.managedActions}>
        {admin && (
          <button
            type="button"
            role="switch"
            aria-checked={canView}
            className={styles.viewSwitch}
            data-on={canView || undefined}
            disabled={pending}
            onClick={toggle}
          >
            <span className={styles.viewTrack} aria-hidden="true">
              <span className={styles.viewThumb} />
            </span>
            {canView ? "Accès donné" : "Pas d'accès"}
          </button>
        )}
        <button
          type="button"
          className={styles.danger}
          disabled={pending}
          aria-label={`Retirer ${member.name}`}
          onClick={() => startTransition(() => removeBookMemberAction(bookId, member.userKey))}
        >
          Retirer
        </button>
      </div>
      {error && <small className={styles.error}>{error}</small>}
    </li>
  );
}

function ManageBook({
  bookId,
  editable,
  members,
  admin,
}: {
  bookId: string;
  editable: EditableBook;
  members: ManagedMember[];
  admin: boolean;
}) {
  const [editState, editAction, editing] = useActionState(updateBookAction.bind(null, bookId), {});
  const [addState, addAction, adding] = useActionState(addBookMemberAction.bind(null, bookId), {});
  const [busy, startTransition] = useTransition();

  return (
    <details className={styles.sideBlock} open>
      <summary>Gérer ce book</summary>

      <form action={addAction} className={styles.form}>
        <label className={styles.field}>
          <span>Ajouter un membre (pseudo)</span>
          <input name="pseudo" required maxLength={40} placeholder="pseudo" defaultValue={addState.values?.pseudo} aria-invalid={!!addState.fieldErrors?.pseudo} />
          {addState.fieldErrors?.pseudo && <small className={styles.error}>{addState.fieldErrors.pseudo}</small>}
        </label>
        {addState.message && <p className={addState.ok ? styles.ok : styles.error}>{addState.message}</p>}
        <Button type="submit" size="sm" variant="glass" disabled={adding}>
          {adding ? "…" : "Donner l'accès"}
        </Button>
      </form>

      {admin && members.length > 0 && (
        <p className={styles.sideNote}>
          Interrupteur : accès aux stratégies des autres membres de ce book. Fermé par défaut.
        </p>
      )}
      <ul className={styles.managed} aria-busy={busy}>
        {members.map((member) => (
          <ManagedRow key={member.userKey} bookId={bookId} member={member} admin={admin} />
        ))}
        {members.length === 0 && <li className={styles.sideNote}>Aucun membre.</li>}
      </ul>

      <form action={editAction} className={styles.form}>
        <BookFields state={editState} initial={editable} withStats />
        <Button type="submit" size="sm" variant="glass" disabled={editing}>
          {editing ? "…" : "Enregistrer"}
        </Button>
      </form>

      <button
        type="button"
        className={styles.danger}
        disabled={busy}
        onClick={() => {
          if (window.confirm("Supprimer ce book ? Ses membres perdront l'accès. C'est définitif.")) {
            startTransition(() => deleteBookAction(bookId));
          }
        }}
      >
        Supprimer le book
      </button>
    </details>
  );
}
