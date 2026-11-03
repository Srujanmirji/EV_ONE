import { ComingSoon } from "@/components/coming-soon";
import { sectionFor } from "@/lib/site";
import { sectionMetadata } from "@/lib/site-metadata";

const section = sectionFor("/accessories");
export const metadata = sectionMetadata(section);

export default function AccessoriesPage() {
  return <ComingSoon section={section} />;
}
