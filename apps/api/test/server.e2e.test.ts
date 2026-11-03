import { type ChildProcess, spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const entry = fileURLToPath(new URL("../dist/main.js", import.meta.url));
let child: ChildProcess | undefined;

interface Body {
  data: { status?: string; checks?: unknown; draining?: boolean };
  error: { code: string; message: string };
  meta: { requestId: string };
}
const readJson = async (res: Response): Promise<Body> =>
  (await res.json()) as Body;

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const address = srv.address();
      srv.close(() =>
        typeof address === "object" && address
          ? resolve(address.port)
          : reject(new Error("no port")),
      );
    });
  });
}

function run(env: Record<string, string>) {
  const proc = spawn(process.execPath, [entry], {
    env: { PATH: process.env.PATH ?? "", ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  proc.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
  proc.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
  return { proc, output: () => ({ stdout, stderr }) };
}

async function waitForLive(base: string): Promise<void> {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${base}/api/v1/health/live`)).ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("API did not become live");
}

afterEach(() => {
  if (child && child.exitCode === null) child.kill("SIGKILL");
  child = undefined;
});

describe("built API process", () => {
  it("starts, answers liveness and readiness, and shuts down gracefully on SIGTERM", async () => {
    const port = await freePort();
    const { proc, output } = run({
      NODE_ENV: "production",
      API_PORT: String(port),
    });
    child = proc;
    const base = `http://127.0.0.1:${port}`;
    await waitForLive(base);

    const ready = await fetch(`${base}/api/v1/health/ready`);
    expect(ready.status).toBe(200);
    expect((await readJson(ready)).data.status).toBe("ready");

    proc.kill("SIGTERM");
    // NestJS runs its shutdown hooks, then re-raises the signal, so the
    // process ends by SIGTERM rather than exit code 0.
    const [code, signal] = (await once(proc, "exit")) as [
      number | null,
      string | null,
    ];
    expect(code === 0 || signal === "SIGTERM").toBe(true);
    expect(output().stdout).toContain("Stopped gracefully on SIGTERM");
  });

  it("refuses to start on invalid config and does not print the value", async () => {
    const secretLooking = "sk_live_should_never_be_printed";
    const { proc, output } = run({ API_PORT: secretLooking });
    child = proc;
    const [code] = (await once(proc, "exit")) as [number | null];
    expect(code).toBe(1);
    const { stdout, stderr } = output();
    expect(stderr).toContain("Invalid API configuration");
    expect(stderr).toContain("API_PORT");
    expect(stdout + stderr).not.toContain(secretLooking);
  });
});
