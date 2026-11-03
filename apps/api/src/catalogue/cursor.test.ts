import { describe, expect, it } from "vitest";
import { RequestValidationError } from "../common/validation.js";
import { decodeCursor, encodeCursor } from "./cursor.js";

describe("model cursor", () => {
  const cursor = {
    n: "DEMO Ünïcode, name",
    i: "3f1c2a9e-8b7d-4c6e-9a1b-2d3e4f5a6b7c",
  };

  it("round-trips exactly", () => {
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it("is URL-safe", () => {
    expect(encodeCursor(cursor)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it.each([
    "",
    "not-base64!",
    Buffer.from("{}").toString("base64url"),
    Buffer.from('{"n":"x","i":"nope"}').toString("base64url"),
  ])("rejects tampered cursor %j as a validation error", (raw) => {
    expect(() => decodeCursor(raw)).toThrow(RequestValidationError);
  });
});
