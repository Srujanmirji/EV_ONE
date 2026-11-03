import { ComingSoon } from "@/components/coming-soon";
import { sectionFor } from "@/lib/site";
import { sectionMetadata } from "@/lib/site-metadata";

const section = sectionFor("/finance");
export const metadata = sectionMetadata(section);

export default function FinancePage() {
  return <ComingSoon section={section} />;
}
