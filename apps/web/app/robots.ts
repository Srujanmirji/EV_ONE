import type { MetadataRoute } from "next";
import { INDEXING_ENABLED, SITE_ORIGIN } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: INDEXING_ENABLED
      ? { userAgent: "*", allow: "/" }
      : { userAgent: "*", disallow: "/" },
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  };
}
