import { createTransport } from "@sentry/core";
import { afterAll, describe, expect, it } from "vitest";
import {
  captureAlert,
  captureError,
  flushErrorTracking,
  initErrorTracking,
  Sentry,
} from "./sentry.js";

// Capture exactly what would be sent to Sentry, without a network or account.
const sent: string[] = [];
const transport = (options: Parameters<typeof createTransport>[0]) =>
  createTransport(options, (request) => {
    sent.push(
      typeof request.body === "string"
        ? request.body
        : new TextDecoder().decode(request.body),
    );
    return Promise.resolve({ statusCode: 200 });
  });

afterAll(async () => {
  await Sentry.close();
});

describe("error tracking", () => {
  it("is off without a DSN", () => {
    expect(initErrorTracking({ environment: "test", service: "t" })).toBe(
      false,
    );
  });

  it("sends errors and alerts with personal data removed", async () => {
    expect(
      initErrorTracking({
        dsn: "https://publickey@o0.ingest.sentry.io/0",
        environment: "test",
        service: "evone-test",
        transport,
      }),
    ).toBe(true);

    Sentry.addBreadcrumb({
      message: "user asha@example.in clicked",
      data: { phone: "9876543210" },
    });
    captureError(
      new Error(
        "insert failed for asha@example.in via postgresql://u:pw@db/evone",
      ),
      { requestId: "r-1" },
    );
    captureAlert("job.dead_letter", {
      name: "system.ping.v1",
      reason: "exhausted",
    });
    await flushErrorTracking();

    const payload = sent.join("\n");
    expect(sent.length).toBeGreaterThanOrEqual(2);
    expect(payload).toContain("job.dead_letter");
    expect(payload).toContain("evone-test");
    expect(payload).toContain("r-1");
    for (const secret of ["asha@example.in", "9876543210", "u:pw@"]) {
      expect(payload).not.toContain(secret);
    }
    expect(payload).toContain("[redacted]");
  });
});
