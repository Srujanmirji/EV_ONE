import type { Metadata } from "next";
import { INDEXING_ENABLED, SITE_ORIGIN, type SiteSection } from "./site";

/**
 * The preview must stay out of search indexes and must say plainly that no
 * discovery or transactions exist yet, until publishing is approved.
 */
export const PREVIEW_DISCLOSURE =
  "Vehicle discovery and transactions are not available yet.";

const robots = { index: INDEXING_ENABLED, follow: INDEXING_ENABLED };

/** Root metadata; pages fill the `%s` of the title template. */
export const previewMetadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: { default: "EVONE — Preview", template: "%s · EVONE" },
  description: `An early look at EVONE, an electric vehicle ecosystem for India. ${PREVIEW_DISCLOSURE}`,
  robots,
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: "EVONE", locale: "en_IN" },
} satisfies Metadata;

export function sectionMetadata(section: SiteSection): Metadata {
  return {
    title: section.title,
    description: section.description,
    robots,
    alternates: { canonical: section.href },
    openGraph: {
      title: `${section.title} · EVONE`,
      description: section.description,
      url: section.href,
    },
  };
}
