import { ComingSoon } from "@/components/coming-soon";
import { sectionFor } from "@/lib/site";
import { sectionMetadata } from "@/lib/site-metadata";

const section = sectionFor("/used-evs");
export const metadata = sectionMetadata(section);

export default function UsedEvsPage() {
  return <ComingSoon section={section} />;
}
