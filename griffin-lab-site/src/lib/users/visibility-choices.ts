/**
 * Réglage d'anonymat d'un compte (partagé entre serveur et navigateur) :
 * - `public` : nom et profil visibles par tout le monde ;
 * - `books` : seulement par les personnes qui partagent au moins un book avec lui ;
 * - `anonymous` : par personne (il apparaît comme « Anonyme »).
 */
export type ProfileVisibility = "public" | "books" | "anonymous";

export const PROFILE_VISIBILITIES: ProfileVisibility[] = ["public", "books", "anonymous"];

export const visibilityChoices: Record<ProfileVisibility, { label: string; help: string }> = {
  public: { label: "Public", help: "Ton pseudo et ton profil sont visibles par tout le monde." },
  books: {
    label: "Anonyme hors de mes books",
    help: "Seules les personnes qui partagent un book avec toi voient ton pseudo et ton profil.",
  },
  anonymous: { label: "Anonyme pour tout le monde", help: "Tu apparais comme « Anonyme » partout, sans profil." },
};

export const visibilityChoicesEn: Record<ProfileVisibility, { label: string; help: string }> = {
  public: { label: "Public", help: "Your username and profile are visible to everyone." },
  books: {
    label: "Anonymous outside my books",
    help: "Only people who share a book with you see your username and profile.",
  },
  anonymous: { label: "Anonymous to everyone", help: "You appear as “Anonymous” everywhere, with no profile." },
};
