"use server";

import { estimateSavings } from "@/lib/savings";
import type { SavingsState } from "@/lib/savings-form";

export async function calculateSavingsAction(
  _previous: SavingsState,
  data: FormData,
): Promise<SavingsState> {
  return estimateSavings(data);
}
