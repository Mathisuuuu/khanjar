import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BooksView } from "@/components/books/BooksView";
import { getBook } from "@/lib/books/repository";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const book = await getBook((await params).id);
  return { title: book ? `${book.name} · Books` : "Books", robots: { index: false, follow: false } };
}

export default async function BookPage({ params }: Props) {
  const { id } = await params;
  if (!(await getBook(id))) notFound();
  return <BooksView selectedId={id} />;
}
