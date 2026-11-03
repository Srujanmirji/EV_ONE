import { ComingSoon } from "@/components/coming-soon";
import { sectionFor } from "@/lib/site";
import { sectionMetadata } from "@/lib/site-metadata";

const section = sectionFor("/news");
export const metadata = sectionMetadata(section);

export default function NewsPage() {
  return <ComingSoon section={section} />;
}
