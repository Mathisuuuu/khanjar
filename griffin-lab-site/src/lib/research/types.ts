/**
 * Modèle des espaces de recherche.
 * Un groupe rassemble des publications (façon blog) avec pièces jointes.
 * - `official` : recherches de l'équipe Fleija ; `community` : partagées par les membres.
 * - `public` : lisible par tous ; `private` : propriétaire et membres invités uniquement.
 */

export type GroupKind = "official" | "community";
export type Visibility = "public" | "private";

/** `editor` peut publier et supprimer ; `viewer` peut seulement lire (utile pour un groupe privé). */
export type MemberRole = "editor" | "viewer";

export type Member = {
  /** Les membres sont invités par e-mail (en minuscules). */
  email: string;
  role: MemberRole;
  addedAt: string;
};

export type ResearchGroup = {
  id: string;
  name: string;
  description: string;
  kind: GroupKind;
  visibility: Visibility;
  ownerId: string;
  ownerName: string;
  members: Member[];
  createdAt: string;
  updatedAt: string;
};

export type AttachmentKind = "pdf" | "script" | "notebook" | "data";

export type Attachment = {
  id: string;
  name: string;
  size: number; // octets
  mime: string;
  kind: AttachmentKind;
};

export type ResearchPost = {
  id: string;
  groupId: string;
  authorId: string;
  authorName: string;
  title: string;
  /** Surtitre en petites capitales (ex. « Backtesting »). */
  category?: string;
  /** Chapô sous le titre ; à défaut, le début du texte. */
  summary?: string;
  body: string;
  link?: string;
  attachments: Attachment[];
  createdAt: string;
  updatedAt?: string;
};

/** Contenu modifiable d'une publication. */
export type PostContent = Pick<ResearchPost, "title" | "category" | "summary" | "body" | "link">;

export const kindLabels: Record<GroupKind, string> = { official: "Fleija", community: "Communauté" };
export const visibilityLabels: Record<Visibility, string> = { public: "Public", private: "Privé" };
export const roleLabels: Record<MemberRole, string> = { editor: "Peut publier", viewer: "Lecture seule" };

export const kindLabelsEn: Record<GroupKind, string> = { official: "Fleija", community: "Community" };
export const visibilityLabelsEn: Record<Visibility, string> = { public: "Public", private: "Private" };
export const roleLabelsEn: Record<MemberRole, string> = { editor: "Can post", viewer: "Read only" };
