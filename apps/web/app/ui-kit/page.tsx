import type { Metadata } from "next";
import { UiKit } from "./ui-kit";

// Internal component reference for review (EV-004) and automated
// accessibility checks. Not linked, not in sitemap.xml, never indexed.
export const metadata: Metadata = {
  title: "Component reference",
  description:
    "Internal reference of EVONE interface components and their states.",
  robots: { index: false, follow: false },
};

export default function UiKitPage() {
  return <UiKit />;
}
