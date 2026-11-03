import { describe, expect, it } from "vitest";
import { createEvoneClient } from "./index.js";

describe("createEvoneClient", () => {
  it("prefixes /api/v1 and returns typed data", async () => {
    const requested: string[] = [];
    const client = createEvoneClient({
      origin: "http://api.test/",
      fetch: (input: Request) => {
        requested.push(input.url);
        return Promise.resolve(
          Response.json({
            data: { status: "ok" },
            meta: { requestId: "3f1c2a9e-8b7d-4c6e-9a1b-2d3e4f5a6b7c" },
          }),
        );
      },
    });
    const { data, error } = await client.GET("/health/live");
    expect(requested).toEqual(["http://api.test/api/v1/health/live"]);
    expect(error).toBeUndefined();
    expect(data?.data.status).toBe("ok");
  });

  it("surfaces the error envelope on non-2xx responses", async () => {
    const client = createEvoneClient({
      origin: "http://api.test",
      fetch: () =>
        Promise.resolve(
          Response.json(
            {
              data: { status: "not_ready", checks: [], draining: true },
              meta: { requestId: "3f1c2a9e-8b7d-4c6e-9a1b-2d3e4f5a6b7c" },
            },
            { status: 503 },
          ),
        ),
    });
    const { data, error, response } = await client.GET("/health/ready");
    expect(response.status).toBe(503);
    expect(data).toBeUndefined();
    expect(error).toMatchObject({ data: { status: "not_ready" } });
  });
});
