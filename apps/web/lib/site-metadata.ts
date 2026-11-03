import type { Metadata } from "next";

/**
 * The public preview must stay out of search indexes and must say plainly
 * that no discovery or transactions exist yet, until publishing is approved.
 */
export const PREVIEW_DISCLOSURE =
  "Vehicle discovery and transactions are not available yet.";

export const previewMetadata = {
  title: "EVONE — Preview",
  description: `An early look at EVONE, an electric vehicle ecosystem for India. ${PREVIEW_DISCLOSURE}`,
  robots: { index: false, follow: false },
} satisfies Metadata;
