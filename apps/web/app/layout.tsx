import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EVONE — Preview",
  description:
    "An early look at EVONE, an electric vehicle ecosystem for India. Vehicle discovery and transactions are not available yet.",
  robots: { index: false, follow: false },
};

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
