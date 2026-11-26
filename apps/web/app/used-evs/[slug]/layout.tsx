import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { readListing } from "./listing";

export default async function UsedEvDetailLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // Resolve visibility above the loading boundary so direct visits return HTTP 404.
  if ((await readListing(slug)).kind === "not-found") notFound();

  return children;
}
