import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BooksView } from "@/components/books/BooksView";
import { listBooks, listBooksOf } from "@/lib/books/repository";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Books", robots: { index: false, follow: false } };

export default async function BooksPage() {
  // ouvre directement le premier book accessible
  const viewer = await getViewer();
  if (viewer) {
    const books = viewer.isTeam || viewer.isAdmin ? await listBooks() : await listBooksOf(viewer.id);
    if (books.length > 0) redirect(`/books/${books[0].id}`);
  }
  return <BooksView />;
}
