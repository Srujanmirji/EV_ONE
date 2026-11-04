import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const fatal = new URL("../dist/observability/fatal.js", import.meta.url).href;
const smoke = fileURLToPath(
  new URL("../dist/observability/smoke.js", import.meta.url),
);

it.each([
  ["throw new Error('private_should_not_log')", "process.uncaught_exception"],
  [
    "Promise.reject(new Error('private_should_not_log'))",
    "process.unhandled_rejection",
  ],
])("sanitizes a fatal process failure and exits 1", async (failure, event) => {
  const proc = spawn(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import { installFatalHandlers } from ${JSON.stringify(fatal)}; installFatalHandlers(); ${failure};`,
    ],
    {
      env: { PATH: process.env.PATH ?? "" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  proc.stdout.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });
  proc.stderr.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });
  const [code] = (await once(proc, "exit")) as [number | null];
  expect(code).toBe(1);
  expect(output).toContain(event);
  expect(output).not.toContain("private_should_not_log");
  expect(() => JSON.parse(output) as unknown).not.toThrow();
});

it("refuses a smoke send without a DSN", async () => {
  const proc = spawn(process.execPath, [smoke], {
    env: { PATH: process.env.PATH ?? "" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  proc.stderr.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });
  const [code] = (await once(proc, "exit")) as [number | null];
  expect(code).toBe(1);
  expect(output).toContain("telemetry.delivery_failed");
});

it.each([200, 403])(
  "smoke exits according to local ingestion HTTP %s",
  async (status) => {
    const server = createServer((req, res) => {
      req.resume();
      req.on("end", () => {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end("{}");
      });
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("No local port");
    try {
      const proc = spawn(process.execPath, [smoke], {
        env: {
          PATH: process.env.PATH ?? "",
          SENTRY_DSN: `http://localtest@127.0.0.1:${address.port}/1`,
          NODE_ENV: "test",
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let output = "";
      proc.stderr.on("data", (chunk: Buffer) => {
        output += chunk.toString();
      });
      const [code] = (await once(proc, "exit")) as [number | null];
      expect(code).toBe(status === 200 ? 0 : 1);
      expect(output).not.toContain("127.0.0.1");
      if (status === 403) expect(output).toContain("telemetry.delivery_failed");
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  },
);

it("bounds smoke shutdown when ingestion does not answer", async () => {
  const server = createServer((req) => req.resume());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No local port");
  try {
    const started = Date.now();
    const proc = spawn(process.execPath, [smoke], {
      env: {
        PATH: process.env.PATH ?? "",
        SENTRY_DSN: `http://localtest@127.0.0.1:${address.port}/1`,
        NODE_ENV: "test",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    proc.stderr.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    const [code] = (await once(proc, "exit")) as [number | null];
    expect(code).toBe(1);
    expect(output).toContain("telemetry.delivery_failed");
    expect(Date.now() - started).toBeLessThan(6000);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
