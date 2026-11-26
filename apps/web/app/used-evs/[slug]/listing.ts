import { cache } from "react";
import { loadUsedEvDetail } from "@/lib/used-evs";

export const readListing = cache((slug: string) => loadUsedEvDetail(slug));
