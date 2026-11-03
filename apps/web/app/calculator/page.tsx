import { ComingSoon } from "@/components/coming-soon";
import { sectionFor } from "@/lib/site";
import { sectionMetadata } from "@/lib/site-metadata";

const section = sectionFor("/calculator");
export const metadata = sectionMetadata(section);

export default function CalculatorPage() {
  return <ComingSoon section={section} />;
}
