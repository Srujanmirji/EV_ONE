import { describe, expect, it } from "vitest";
import { REDACTED, redact, redactString } from "./redact.js";

describe("redactString", () => {
  it.each([
    ["Contact asha.k@example.in about it", "Contact [redacted] about it"],
    ["call +91 98765 43210 now", "call [redacted] now"],
    ["call 9876543210", "call [redacted]"],
    ["call 09876543210.", "call [redacted]."],
    [
      "postgresql://evone:s3cr3t@db.internal:5432/evone",
      "postgresql://[redacted]@db.internal:5432/evone",
    ],
    ["redis://default:pw@redis:6379", "redis://[redacted]@redis:6379"],
    ["Authorization: Bearer abc.def-123", "Authorization: Bearer [redacted]"],
    ["jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig_nature-x", "jwt [redacted]"],
    ["aadhaar 1234 5678 9012", "aadhaar [redacted]"],
  ])("masks %j", (input, expected) => {
    expect(redactString(input)).toBe(expected);
  });

  it.each([
    "3f1c2a9e-8b7d-4c6e-9a1b-2d3e4f5a6b7c",
    "GET /api/v1/models 200 in 12 ms",
    "battery 40.5 kWh, range 1200 km",
    "order 2026110312345",
    "status 503",
  ])("keeps non-personal text %j", (input) => {
    expect(redactString(input)).toBe(input);
  });
});

describe("redact", () => {
  it("removes values under sensitive keys at any depth", () => {
    const input = {
      requestId: "3f1c2a9e-8b7d-4c6e-9a1b-2d3e4f5a6b7c",
      user: {
        email: "a@b.in",
        phoneE164: "+919876543210",
        contactName: "Asha",
        city: "Hubballi",
      },
      headers: {
        authorization: "Bearer x",
        cookie: "s=1",
        "x-request-id": "r1",
      },
      lead: { message: "please call me", notes: "VIP" },
      items: [{ password: "p" }, { apiKey: "k" }],
      status: 500,
    };
    expect(redact(input)).toEqual({
      requestId: "3f1c2a9e-8b7d-4c6e-9a1b-2d3e4f5a6b7c",
      user: {
        email: REDACTED,
        phoneE164: REDACTED,
        contactName: REDACTED,
        city: "Hubballi",
      },
      headers: {
        authorization: REDACTED,
        cookie: REDACTED,
        "x-request-id": "r1",
      },
      lead: { message: REDACTED, notes: REDACTED },
      items: [{ password: REDACTED }, { apiKey: REDACTED }],
      status: 500,
    });
  });

  it("masks patterns inside otherwise safe fields and error messages", () => {
    expect(redact({ detail: "duplicate key for asha@example.in" })).toEqual({
      detail: "duplicate key for [redacted]",
    });
    expect(redact(new Error("connect postgresql://u:pw@h/db failed"))).toEqual({
      name: "Error",
      message: "connect postgresql://[redacted]@h/db failed",
    });
  });

  it("does not mutate the input and survives cycles", () => {
    const input: Record<string, unknown> = { email: "a@b.in" };
    input.self = input;
    const out = redact(input);
    expect(input.email).toBe("a@b.in");
    expect(out).toEqual({ email: REDACTED, self: "[circular]" });
  });
});

describe("sensitive key matching", () => {
  it.each([
    "panNumber",
    "pan_number",
    "PAN",
    "dateOfBirth",
    "postalCode",
    "upiId",
    "accountNumber",
    "firstName",
  ])("treats %s as sensitive", (key) =>
    expect(redact({ [key]: "x" })).toEqual({ [key]: REDACTED }),
  );

  it.each([
    "company",
    "panel",
    "vehicleType",
    "updatedAt",
    "variantId",
    "pageCount",
  ])("keeps %s", (key) =>
    expect(redact({ [key]: "x" })).toEqual({ [key]: "x" }),
  );

  it("catches IP fields in any case style without wiping words ending in 'ip'", () => {
    expect(
      redact({
        ip: "1.2.3.4",
        clientIp: "1.2.3.4",
        ipAddress: "1.2.3.4",
        ownership: 2,
        relationship: "x",
      }),
    ).toEqual({
      ip: REDACTED,
      clientIp: REDACTED,
      ipAddress: REDACTED,
      ownership: 2,
      relationship: "x",
    });
  });
});
