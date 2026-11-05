import { createServer } from "node:http";
import type { Worker } from "bullmq";
import { WORKER_HEARTBEAT_KEY } from "./foundation.js";

export function createWorkerHealthServer(worker: Worker) {
  let draining = false;
  const available = () =>
    !draining &&
    !worker.closing &&
    worker.isRunning() &&
    !worker.isPaused() &&
    worker.getBackend().connection.status === "ready" &&
    worker.getBackend().blockingConnection?.status === "ready";

  async function ready(): Promise<boolean> {
    if (!available()) return false;
    let timer: NodeJS.Timeout | undefined;
    try {
      const backend = worker.getBackend();
      const read = Promise.all([backend.client, backend.blockingClient]).then(
        async ([redis, blocking]) => {
          if (redis.status !== "ready" || blocking?.status !== "ready")
            return false;
          await redis.get(WORKER_HEARTBEAT_KEY);
          return Boolean(
            available() &&
            redis.status === "ready" &&
            blocking.status === "ready",
          );
        },
      );
      return await Promise.race([
        read,
        new Promise<boolean>((_, reject) => {
          timer = setTimeout(() => reject(new Error("timeout")), 2000);
        }),
      ]);
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  const server = createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    if (
      req.method !== "GET" ||
      !["/health/live", "/health/ready"].includes(req.url ?? "")
    ) {
      res.writeHead(404).end(JSON.stringify({ status: "not_found" }));
    } else if (req.url === "/health/live") {
      res.writeHead(200).end(JSON.stringify({ status: "ok" }));
    } else {
      void ready().then((healthy) => {
        res.writeHead(healthy ? 200 : 503).end(
          JSON.stringify({
            status: healthy ? "ready" : "not_ready",
            draining,
          }),
        );
      });
    }
  });
  return Object.assign(server, {
    setDraining: () => {
      draining = true;
    },
  });
}
