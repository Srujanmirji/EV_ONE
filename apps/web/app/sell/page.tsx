import { ComingSoon } from "@/components/coming-soon";
import { sectionFor } from "@/lib/site";
import { sectionMetadata } from "@/lib/site-metadata";

const section = sectionFor("/sell");
export const metadata = sectionMetadata(section);

export default function SellPage() {
  return <ComingSoon section={section} />;
}
