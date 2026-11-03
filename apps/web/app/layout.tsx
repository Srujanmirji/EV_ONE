import type { Metadata, Viewport } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { previewMetadata } from "@/lib/site-metadata";
import "./globals.css";

export const metadata: Metadata = previewMetadata;

export const viewport: Viewport = {
  themeColor: "#f8f9fb",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      {/* min-w-0 on children: flex items otherwise refuse to shrink below
          their content (e.g. a wide table), widening the whole page. */}
      <body className="flex min-h-svh flex-col [&>*]:min-w-0">
        <a
          href="#main"
          className="sr-only z-30 min-h-11 bg-paper px-6 py-3 text-ink focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
        >
          Skip to content
        </a>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
