import { SavingsRequest, SavingsResponse } from "@evone/contracts";
import { createEvoneClient } from "@evone/sdk";
import {
  savingsFields,
  type SavingsFormKey,
  type SavingsState,
} from "./savings-form";

export function parseSavingsForm(data: FormData) {
  const raw: Record<string, unknown> = {};
  const fields: Partial<Record<SavingsFormKey, string>> = {};
  for (const { key } of savingsFields) {
    const value = data.get(key);
    const text = typeof value === "string" ? value.trim() : "";
    if (value !== null && typeof value !== "string")
      fields[key] = "Enter a number.";
    if (key === "purchasePriceDeltaInr") {
      if (text) {
        const premium = Number(text);
        if (!Number.isFinite(premium) || Number(premium.toFixed(2)) !== premium)
          fields[key] = "Enter rupees with up to two decimal places.";
        else raw.purchasePriceDeltaPaise = Math.round(premium * 100);
      }
    } else raw[key] = text ? Number(text) : undefined;
  }
  const parsed = SavingsRequest.safeParse(raw);
  if (!parsed.success)
    for (const issue of parsed.error.issues) {
      const name =
        issue.path[0] === "purchasePriceDeltaPaise"
          ? "purchasePriceDeltaInr"
          : issue.path[0];
      const field = savingsFields.find((field) => field.key === name);
      if (field)
        fields[field.key] ??=
          issue.code === "invalid_type"
            ? "Enter a number."
            : issue.code === "too_small" || issue.code === "too_big"
              ? `Enter a number from ${field.min.toLocaleString("en-IN")} to ${field.max.toLocaleString("en-IN")}.`
              : "Use up to six decimal places.";
    }
  if (Object.keys(fields).length || !parsed.success)
    return { kind: "invalid" as const, fields };
  return { kind: "valid" as const, input: parsed.data };
}

export async function estimateSavings(
  data: FormData,
  options: { apiOrigin?: string; fetch?: typeof fetch } = {},
): Promise<SavingsState> {
  const parsed = parseSavingsForm(data);
  if (parsed.kind === "invalid") return parsed;
  const origin = options.apiOrigin ?? process.env.API_BASE_URL;
  if (!origin) return { kind: "unavailable" };
  try {
    const api = createEvoneClient({
      origin,
      ...(options.fetch ? { fetch: options.fetch } : {}),
    });
    const response = await api.POST("/calculators/ev-savings", {
      body: parsed.input,
      signal: AbortSignal.timeout(5000),
    });
    const result = SavingsResponse.safeParse(response.data);
    if (!result.success) return { kind: "unavailable" };
    return { kind: "success", input: parsed.input, result: result.data.data };
  } catch {
    console.error("calculator: estimate request failed");
    return { kind: "unavailable" };
  }
}
