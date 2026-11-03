import type { MetadataRoute } from "next";
import { SITE_ORIGIN, sections } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_ORIGIN}/` },
    ...sections.map((s) => ({ url: `${SITE_ORIGIN}${s.href}` })),
  ];
}
