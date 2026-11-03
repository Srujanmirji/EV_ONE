import type { Metadata } from "next";
import { previewMetadata } from "@/lib/site-metadata";
import "./globals.css";

export const metadata: Metadata = previewMetadata;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      <body>
        <a
          href="#main"
          className="sr-only z-10 min-h-11 bg-paper px-6 py-3 text-ink focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
