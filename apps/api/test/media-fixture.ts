import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

/** Disposable S3-shaped HTTP fixture, not proof of R2 signature enforcement. */
export async function mediaFixture() {
  const objects = new Map<string, { body: Buffer; type: string }>();
  let failing = false;
  const server = createServer((req, res) => {
    void (async () => {
      const key = decodeURIComponent(
        new URL(req.url!, "http://fixture").pathname,
      );
      if (failing) {
        res.writeHead(503).end();
        return;
      }
      if (req.method === "PUT") {
        const chunks: Buffer[] = [];
        for await (const chunk of req)
          chunks.push(Buffer.from(chunk as Uint8Array));
        objects.set(key, {
          body: Buffer.concat(chunks),
          type: String(req.headers["content-type"]),
        });
        res.writeHead(200, { ETag: '"synthetic"' }).end();
      } else if (req.method === "DELETE") {
        objects.delete(key);
        res.writeHead(204).end();
      } else {
        const object = objects.get(key);
        if (!object) {
          res.writeHead(404).end();
          return;
        }
        res.writeHead(200, {
          "Content-Type": object.type,
          "Content-Length": object.body.length,
        });
        res.end(object.body);
      }
    })().catch(() => {
      res.writeHead(500).end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {
    objects,
    endpoint,
    fail: (value: boolean) => {
      failing = value;
    },
    env: {
      MEDIA_MODE: "r2-local",
      MEDIA_ENDPOINT: endpoint,
      MEDIA_BUCKET: "local-media",
      MEDIA_ACCESS_KEY_ID: "synthetic-key",
      MEDIA_SECRET_ACCESS_KEY: "synthetic-secret",
    },
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      }),
  };
}
