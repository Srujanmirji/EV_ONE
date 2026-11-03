import { ComingSoon } from "@/components/coming-soon";
import { sectionFor } from "@/lib/site";
import { sectionMetadata } from "@/lib/site-metadata";

const section = sectionFor("/charging");
export const metadata = sectionMetadata(section);

export default function ChargingPage() {
  return <ComingSoon section={section} />;
}
