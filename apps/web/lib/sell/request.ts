import { ErrorEnvelope } from "@evone/contracts";
export class SellerApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
export type SellerRequest = (
  path: string,
  method?: "GET" | "POST" | "PATCH" | "DELETE",
  body?: unknown,
) => Promise<unknown>;
export function sellerRequest(
  getToken: () => Promise<string | null>,
): SellerRequest {
  return async (path, method = "GET", body) => {
    let token: string | null;
    try {
      token = await getToken();
    } catch {
      throw new SellerApiError(401, "Sign in again before continuing.");
    }
    if (!token)
      throw new SellerApiError(401, "Sign in again before continuing.");
    let response: Response, data: unknown;
    try {
      response = await fetch(`/sell/api${path}`, {
        method,
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(15000),
      });
      data = await response.json();
    } catch {
      throw new SellerApiError(
        503,
        "The seller API is unavailable. Your unsaved values are still here.",
      );
    }
    if (!response.ok) {
      const error = ErrorEnvelope.safeParse(data);
      throw new SellerApiError(
        response.status,
        error.success
          ? error.data.error.message
          : "The seller request failed. Try again shortly.",
      );
    }
    return data;
  };
}
