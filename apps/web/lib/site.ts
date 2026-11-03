/**
 * Single source for the site's sections: header, footer, page metadata and
 * sitemap.xml all read from here, so navigation cannot point at a page that
 * does not exist (a unit test checks every href has a page file).
 * Sections follow 02_UI_UX/03_user_flows_sitemap.md. EV-004 (final sitemap
 * sign-off) is still open; change this list, not individual components.
 */
export interface SiteSection {
  href: `/${string}`;
  /** Short label for navigation. */
  label: string;
  /** Page <h1> and document title. */
  title: string;
  /** One honest sentence for meta description and the page intro. */
  description: string;
  /** Where the link appears. */
  placement: "primary" | "footer";
  /** What visitors are told today. Never imply the feature works. */
  availability: string;
}

export const sections: SiteSection[] = [
  {
    href: "/used-evs",
    label: "Used EVs",
    title: "Used electric vehicles",
    description:
      "Browse used electric vehicles from individual sellers and dealers, and contact them directly.",
    placement: "primary",
    availability:
      "Listings are not available yet. No vehicles are for sale on EVONE today.",
  },
  {
    href: "/evs",
    label: "Explore EVs",
    title: "Explore electric vehicles",
    description:
      "Compare new electric vehicles by sourced specifications, with the test standard behind every range figure.",
    placement: "primary",
    availability: "The catalogue is being prepared and is not published yet.",
  },
  {
    href: "/accessories",
    label: "Accessories",
    title: "EV accessories",
    description:
      "Chargers, cables and accessories matched to your exact electric vehicle.",
    placement: "primary",
    availability:
      "The accessories store is not open yet. Nothing can be ordered today.",
  },
  {
    href: "/charging",
    label: "Charging",
    title: "Charging stations",
    description:
      "Find public charging stations by location, connector and power.",
    placement: "primary",
    availability: "Charging station data is not available yet.",
  },
  {
    href: "/news",
    label: "News",
    title: "EV news and reviews",
    description:
      "Independent news, buying guides and reviews about electric vehicles in India.",
    placement: "primary",
    availability: "No articles have been published yet.",
  },
  {
    href: "/sell",
    label: "Sell your EV",
    title: "Sell your EV",
    description:
      "List your electric vehicle for buyers to find and contact you.",
    placement: "footer",
    availability: "Selling is not open yet. You cannot create a listing today.",
  },
  {
    href: "/calculator",
    label: "Savings calculator",
    title: "EV savings calculator",
    description:
      "Estimate what an electric vehicle could save you compared with petrol or diesel.",
    placement: "footer",
    availability: "The calculator is not available yet.",
  },
  {
    href: "/finance",
    label: "Loans & insurance",
    title: "EV loans and insurance",
    description:
      "Information about financing and insuring an electric vehicle.",
    placement: "footer",
    availability:
      "Loan and insurance services are not offered. EVONE does not collect finance or insurance enquiries.",
  },
];

export const SELL_SECTION = sections.find((s) => s.href === "/sell")!;
export const primaryNav = sections.filter((s) => s.placement === "primary");

export function sectionFor(href: string): SiteSection {
  const section = sections.find((s) => s.href === href);
  if (!section) throw new Error(`Unknown site section ${href}`);
  return section;
}

/**
 * Search indexing stays off until publishing is approved (ADR-002 brand and
 * trademark check before public launch). robots.txt and every page's robots
 * meta read this one switch.
 */
export const INDEXING_ENABLED = false;

/** Absolute origin for canonical URLs and sitemap.xml. */
export const SITE_ORIGIN =
  process.env.PUBLIC_WEB_URL ?? "http://127.0.0.1:3000";
