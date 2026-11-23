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
import { useLocale, useMessage, useT } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { intlLocale, type Locale, type T } from "@/lib/i18n/core";
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

// v2 : cochée par défaut (les anciens choix « décoché » ne comptent plus)
const RESEARCH_KEY = "griffin-lab:books-recherches-v2";

const STAT_FIELDS = (t: T) =>
  [
    { name: "dailyReturn", label: t("Rendement moyen visé par jour (%)", "Target average daily return (%)"), hint: t("0,8", "0.8") },
    { name: "allTime", label: t("All time (%)", "All time (%)"), hint: t("412,6", "412.6") },
    { name: "sharpe", label: "Sharpe", hint: t("1,84", "1.84") },
    { name: "maxDrawdown", label: t("Drawdown max (%)", "Max drawdown (%)"), hint: t("-8,1", "-8.1") },
    { name: "strategies", label: t("Stratégies", "Strategies"), hint: "6" },
  ] as const;

const formatReturn = (value: number, locale: Locale) =>
  `${value > 0 ? "+" : ""}${value.toLocaleString(intlLocale(locale), { minimumFractionDigits: 1, maximumFractionDigits: 1 })}${locale === "en" ? "" : " "}%`;

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
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [showResearch, setShowResearch] = useState(true);
  const [contentsOpen, setContentsOpen] = useState(false);
  useEffect(() => setContentsOpen(false), [selected?.id]);

  useEffect(() => {
    setShowResearch(readFlag(RESEARCH_KEY) ?? true);
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
            aria-label={open ? t("Replier la colonne", "Collapse the column") : t("Déplier la colonne", "Expand the column")}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d={open ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <nav aria-label={t("Liste des books", "Book list")} className={styles.bookNav}>
          {books.length === 0 && open && <p className={styles.sideNote}>{t("Aucun book pour l'instant.", "No books yet.")}</p>}
          <ul className={styles.bookList}>
            {books.map((book) => (
              <li key={book.id}>
                <Link
                  href={`/books/${book.id}`}
                  className={styles.bookItem}
                  aria-current={selected?.id === book.id ? "page" : undefined}
                  title={`${book.name}${book.dayReturn !== null ? ` · ${formatReturn(book.dayReturn, locale)} ${t("sur 1 jour", "over 1 day")}` : ""}${book.locked ? t(" (connexion requise)", " (sign-in required)") : book.member ? t(" · tu en fais partie", " · you're a member") : ""}`}
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
                {t("Afficher les recherches", "Show research")}
                <small>{t("Relie chaque membre aux recherches où il a publié.", "Links each member to the research they've published in.")}</small>
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
            <b>{books.length ? t("Choisis un book dans la colonne de gauche.", "Pick a book in the left column.") : t("Aucun book pour l'instant.", "No books yet.")}</b>
            {team && !books.length && <span>{t("Crée le premier avec « Nouveau book ».", "Create the first one with “New book”.")}</span>}
            {!signedIn && <span>{t("Connecte-toi pour voir les books.", "Sign in to see the books.")}</span>}
          </div>
        )}

        {selected && !selected.access && (
          <div className={styles.message}>
            <span className={styles.ring} style={{ borderColor: selected.color }} aria-hidden="true">
              <LockIcon />
            </span>
            <b>{selected.name}</b>
            <span>{t("Connecte-toi pour voir ce book.", "Sign in to see this book.")}</span>
            {!signedIn && (
              <Button href={`/sign-in?callbackUrl=/books/${selected.id}`} size="sm" variant="glass">
                {t("Se connecter", "Sign in")}
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
                {selected.members.length} {t("membre", "member")}
                {selected.members.length > 1 ? "s" : ""}
                {showResearch &&
                  ` · ${selected.groups.length} ${t("recherche", "research group")}${selected.groups.length > 1 ? "s" : ""}`}
              </p>
              <details className={styles.memberList}>
                <summary>{t("Liste des membres", "Member list")}</summary>
                <ul>
                  {selected.members.map((m) => (
                    <li key={m.id}>
                      {m.href ? <Link href={m.href}>{m.name}</Link> : <span>{m.name}</span>}
                      {m.self && t(" (toi)", " (you)")}
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
                {selected.contents.access ? t("Voir le contenu du book", "View the book contents") : t("Contenu du book", "Book contents")}
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
  const t = useT();
  const message = useMessage();
  return (
    <fieldset className={styles.field}>
      <legend>{t("Couleur", "Colour")}</legend>
      <div className={styles.swatches}>
        {PALETTE.map((swatch) => (
          <button
            key={swatch}
            type="button"
            className={styles.swatch}
            style={{ background: swatch }}
            aria-label={`${t("Couleur", "Colour")} ${swatch}`}
            aria-pressed={color === swatch}
            onClick={() => setColor(swatch)}
          />
        ))}
        <input type="color" name="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label={t("Autre couleur", "Other colour")} />
      </div>
      {error && <small className={styles.error}>{message(error)}</small>}
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
  const t = useT();
  const message = useMessage();
  return (
    <>
      <label className={styles.field}>
        <span>{t("Nom", "Name")}</span>
        <input name="name" required maxLength={60} defaultValue={state.values?.name ?? initial.name} aria-invalid={!!errors.name} />
        {errors.name && <small className={styles.error}>{message(errors.name)}</small>}
      </label>
      <label className={styles.field}>
        <span>Description</span>
        <textarea name="description" maxLength={300} rows={2} defaultValue={state.values?.description ?? initial.description} />
        {errors.description && <small className={styles.error}>{message(errors.description)}</small>}
      </label>
      <ColorField initial={state.values?.color ?? initial.color} error={errors.color} />
      {withStats && (
        <fieldset className={styles.field}>
          <legend>{t("Chiffres (accueil et survol)", "Figures (home and hover)")}</legend>
          <div className={styles.statsGrid}>
            {STAT_FIELDS(t).map(({ name, label, hint }) => (
              <label key={name} className={styles.field}>
                <span>{label}</span>
                <input
                  name={name}
                  inputMode="decimal"
                  placeholder={hint}
                  defaultValue={state.values?.[name] ?? initial[name] ?? ""}
                  aria-invalid={!!errors[name]}
                />
                {errors[name] && <small className={styles.error}>{message(errors[name])}</small>}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {state.message && <p className={state.ok ? styles.ok : styles.error}>{message(state.message)}</p>}
    </>
  );
}

function NewBookForm() {
  const [state, action, pending] = useActionState(createBookAction, {});
  const t = useT();
  return (
    <details className={styles.sideBlock}>
      <summary>{t("Nouveau book", "New book")}</summary>
      <form action={action} className={styles.form}>
        <BookFields state={state} initial={{ name: "", description: "", color: PALETTE[0] }} />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "…" : t("Créer le book", "Create the book")}
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
  const t = useT();
  const message = useMessage();
  useEffect(() => setCanView(member.canView), [member.canView]);

  const toggle = () => {
    const next = !canView;
    setCanView(next);
    setError("");
    startTransition(async () => {
      const result = await setStrategyAccessAction(bookId, member.userKey, next);
      if (!result.ok) {
        setCanView(!next);
        setError(result.message ? message(result.message) : t("Échec, réessaie.", "Failed, try again."));
      }
    });
  };

  return (
    <li className={styles.managedRow}>
      <span className={styles.managedName}>
        {member.name}
        {member.masked && <small> · {t("masqué", "hidden")}</small>}
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
            {canView ? t("Accès donné", "Access granted") : t("Pas d'accès", "No access")}
          </button>
        )}
        <button
          type="button"
          className={styles.danger}
          disabled={pending}
          aria-label={t(`Retirer ${member.name}`, `Remove ${member.name}`)}
          onClick={() => startTransition(() => removeBookMemberAction(bookId, member.userKey))}
        >
          {t("Retirer", "Remove")}
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
  const t = useT();
  const message = useMessage();

  return (
    <details className={styles.sideBlock} open>
      <summary>{t("Gérer ce book", "Manage this book")}</summary>

      <form action={addAction} className={styles.form}>
        <label className={styles.field}>
          <span>{t("Ajouter un membre (pseudo)", "Add a member (username)")}</span>
          <input name="pseudo" required maxLength={40} placeholder={t("pseudo", "username")} defaultValue={addState.values?.pseudo} aria-invalid={!!addState.fieldErrors?.pseudo} />
          {addState.fieldErrors?.pseudo && <small className={styles.error}>{message(addState.fieldErrors.pseudo)}</small>}
        </label>
        {addState.message && <p className={addState.ok ? styles.ok : styles.error}>{message(addState.message)}</p>}
        <Button type="submit" size="sm" variant="glass" disabled={adding}>
          {adding ? "…" : t("Donner l'accès", "Grant access")}
        </Button>
      </form>

      {admin && members.length > 0 && (
        <p className={styles.sideNote}>
          {t(
            "Interrupteur : accès aux stratégies des autres membres de ce book. Fermé par défaut.",
            "Switch: access to the strategies of this book's other members. Off by default.",
          )}
        </p>
      )}
      <ul className={styles.managed} aria-busy={busy}>
        {members.map((member) => (
          <ManagedRow key={member.userKey} bookId={bookId} member={member} admin={admin} />
        ))}
        {members.length === 0 && <li className={styles.sideNote}>{t("Aucun membre.", "No members.")}</li>}
      </ul>

      <form action={editAction} className={styles.form}>
        <BookFields state={editState} initial={editable} withStats />
        <Button type="submit" size="sm" variant="glass" disabled={editing}>
          {editing ? "…" : t("Enregistrer", "Save")}
        </Button>
      </form>

      <button
        type="button"
        className={styles.danger}
        disabled={busy}
        onClick={() => {
          if (window.confirm(t("Supprimer ce book ? Ses membres perdront l'accès. C'est définitif.", "Delete this book? Its members will lose access. This cannot be undone."))) {
            startTransition(() => deleteBookAction(bookId));
          }
        }}
      >
        {t("Supprimer le book", "Delete the book")}
      </button>
    </details>
  );
}
