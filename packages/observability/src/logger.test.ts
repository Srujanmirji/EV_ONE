import { describe, expect, it } from "vitest";
import { createLogger } from "./logger.js";

describe("createLogger", () => {
  it("writes redacted JSON lines with service and bindings, respecting level", () => {
    const lines: string[] = [];
    const log = createLogger({
      service: "api",
      level: "info",
      write: (l) => lines.push(l),
    }).child({ requestId: "r1" });
    log.debug("ignored");
    log.info("http.request", {
      path: "/api/v1/models",
      email: "a@b.in",
      note: "call 9876543210",
    });
    expect(lines).toHaveLength(1);
    const line = JSON.parse(lines[0]!) as Record<string, unknown>;
    expect(line).toMatchObject({
      level: "info",
      service: "api",
      event: "http.request",
      requestId: "r1",
      path: "/api/v1/models",
    });
    expect(line.email).toBe("[redacted]");
    expect(lines[0]).not.toContain("9876543210");
  });
});
