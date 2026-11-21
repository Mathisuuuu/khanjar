import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BooksView } from "@/components/books/BooksView";
import { listBooks, listBooksOf } from "@/lib/books/repository";
import { getViewer } from "@/lib/auth/viewer";

export const metadata: Metadata = { title: "Books", robots: { index: false, follow: false } };

export default async function BooksPage() {
  // ouvre directement un book : le premier dont la personne est membre, sinon le premier de la liste
  const viewer = await getViewer();
  if (viewer) {
    const [mine, all] = await Promise.all([listBooksOf(viewer.id), listBooks()]);
    const first = mine[0] ?? all[0];
    if (first) redirect(`/books/${first.id}`);
  }
  return <BooksView />;
}
