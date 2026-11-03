import { ComingSoon } from "@/components/coming-soon";
import { sectionFor } from "@/lib/site";
import { sectionMetadata } from "@/lib/site-metadata";

const section = sectionFor("/evs");
export const metadata = sectionMetadata(section);

export default function EvsPage() {
  return <ComingSoon section={section} />;
}
