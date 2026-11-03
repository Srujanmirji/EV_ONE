import { createServer, type Server } from "node:http";
import type { Redis } from "@evone/queue";
import type { Worker } from "bullmq";

/**
 * Probe endpoints for the host: /health/live answers while the process
 * runs; /health/ready is 200 only when Redis answers, the worker is
 * running, and shutdown has not started.
 */
export function createHealthServer(
  redis: Redis,
  worker: Worker,
  timeoutMs = 2000,
): Server & { setDraining(): void } {
  let draining = false;
  const server = createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    if (req.url === "/health/live") {
      res.writeHead(200).end(JSON.stringify({ status: "ok" }));
      return;
    }
    if (req.url === "/health/ready") {
      const ping = Promise.race([
        redis.ping(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), timeoutMs),
        ),
      ]);
      void ping
        .then(() => !draining && worker.isRunning())
        .catch(() => false)
        .then((ready) => {
          res.writeHead(ready ? 200 : 503).end(
            JSON.stringify({
              status: ready ? "ready" : "not_ready",
              draining,
            }),
          );
        });
      return;
    }
    res.writeHead(404).end(JSON.stringify({ status: "not_found" }));
  });
  return Object.assign(server, { setDraining: () => (draining = true) });
}
