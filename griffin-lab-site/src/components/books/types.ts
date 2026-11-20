/** Données envoyées au navigateur pour la page Books (jamais d'identifiant interne de compte, sauf pour l'équipe). */

/** `monthReturn` et `weekReturn` : chiffres en direct de la simulation horaire (lib/books/simulation.ts). */
export type BookStats = { strategies: number; sharpe: number; maxDrawdown: number; monthReturn: number; weekReturn?: number };

export type BookListItem = { id: string; name: string; color: string; locked: boolean; monthReturn: number | null };

/** Champs modifiables par l'équipe (les chiffres sont des chaînes pour le formulaire). */
export type EditableBook = {
  name: string;
  description: string;
  color: string;
  strategies: string;
  sharpe: string;
  maxDrawdown: string;
  monthReturn: string;
};

export type CanvasMember = {
  /** Identifiant local au canevas (« m0 », « m1 »…), pas l'identifiant du compte. */
  id: string;
  name: string;
  href: string | null;
  anonymous: boolean;
  /** Masqué pour les autres, visible ici pour soi, l'équipe ou un admin. */
  masked: boolean;
  self: boolean;
};

export type CanvasGroup = { id: string; name: string; href: string };

export type SelectedBook =
  | { id: string; name: string; color: string; access: false }
  | {
      id: string;
      name: string;
      color: string;
      description: string;
      stats: BookStats | null;
      access: true;
      members: CanvasMember[];
      groups: CanvasGroup[];
      /** Liens membre → groupe de recherche où il a publié. */
      links: { member: string; group: string }[];
    };

/** Pour l'équipe : gestion des membres d'un book. */
export type ManagedMember = { userKey: string; name: string; masked: boolean };
