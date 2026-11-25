import "server-only";
import { getViewer } from "@/lib/auth/viewer";

/** Auteur d'une proposition, déduit de la session. */
export type Author = {
  /**
   * « fournisseur:identifiant » (ex. « discord:8123… », « credentials:uuid »).
   * Le préfixe évite qu'un identifiant Discord et un identifiant GitHub
   * identiques désignent la même personne.
   */
  id: string;
  /** Nom affiché par défaut si le pseudo est laissé vide. */
  name: string;
  /** Pseudo choisi : obligatoire pour déposer une proposition. */
  hasPseudo: boolean;
  /** Adresse du compte (e-mail, Discord ou Google), pour le suivi des propositions par e-mail. */
  email: string | null;
};

/** Renvoie l'auteur connecté, ou `null` sans session. */
export async function getCurrentAuthor(): Promise<Author | null> {
  const viewer = await getViewer();
  return viewer && { id: viewer.id, name: viewer.name, hasPseudo: viewer.hasPseudo, email: viewer.email };
}
