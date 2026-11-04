import { randomUUID } from "node:crypto";
import { expect, it, vi } from "vitest";
import { MediaService } from "./media.service.js";
import { ServiceUnavailableException } from "@nestjs/common";

const actor = {
  issuer: "https://evone-local.clerk.accounts.dev",
  subject: "synthetic-media",
};
const id = randomUUID(),
  owner = randomUUID();
function harness() {
  const tx = {
    user: {
      findUnique: vi
        .fn()
        .mockResolvedValue({ id: owner, status: "ACTIVE", roles: [{}] }),
    },
    auditEvent: { create: vi.fn().mockResolvedValue({}) },
    mediaAsset: {
      create: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue({
        id,
        ownerId: owner,
        status: "READY",
        objectKey: "ready/synthetic.webp",
      }),
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
  };
  const db = {
    $transaction: vi.fn(
      async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx),
    ),
  };
  const storage = {
    uploadUrl: vi.fn().mockResolvedValue("http://127.0.0.1/signed"),
    readUrl: vi.fn().mockResolvedValue("http://127.0.0.1/read"),
  };
  const config = { media: { mode: "r2-local" } };
  return {
    tx,
    db,
    storage,
    config,
    service: new MediaService(db as never, storage as never, config as never),
  };
}
it("never returns a signed URL when immutable audit storage fails", async () => {
  for (const action of ["MEDIA_UPLOAD", "MEDIA_READ"] as const) {
    const h = harness();
    h.tx.auditEvent.create.mockRejectedValue(
      new Error("secret-url-must-not-be-logged"),
    );
    await expect(
      h.service.run(actor, action, randomUUID(), id, {
        contentType: "image/png",
        sizeBytes: 1,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  }
});
it("disabled media fails before database access or signing", async () => {
  const h = harness();
  h.config.media.mode = "disabled";
  await expect(
    h.service.run(actor, "MEDIA_UPLOAD", randomUUID(), id, {
      contentType: "image/png",
      sizeBytes: 1,
    }),
  ).rejects.toBeInstanceOf(ServiceUnavailableException);
  expect(h.db.$transaction).not.toHaveBeenCalled();
  expect(h.storage.uploadUrl).not.toHaveBeenCalled();
});
it("ownership failure never reaches storage", async () => {
  const h = harness();
  h.tx.mediaAsset.findUnique.mockResolvedValue({
    id,
    ownerId: randomUUID(),
    status: "READY",
    objectKey: "ready/synthetic.webp",
  });
  await expect(
    h.service.run(actor, "MEDIA_READ", randomUUID(), id),
  ).rejects.toMatchObject({ status: 404 });
  expect(h.storage.readUrl).not.toHaveBeenCalled();
  expect(h.tx.auditEvent.create).toHaveBeenCalledWith({
    data: expect.objectContaining({ outcome: "DENIED" }) as unknown,
  });
});
it("a timed-out completion writes only an orphan key and cannot replace the winner", async () => {
  const { default: sharp } = await import("sharp");
  const png = await sharp({
    create: { width: 1, height: 1, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  let release: () => void = () => {};
  const delayed = new Promise<void>((resolve) => {
    release = resolve;
  });
  let entered: () => void = () => {};
  const storing = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const keys: string[] = [];
  let winner: string | undefined;
  const base = {
    user: {
      findUnique: vi
        .fn()
        .mockResolvedValue({ id: owner, status: "ACTIVE", roles: [{}] }),
    },
    auditEvent: { create: vi.fn().mockResolvedValue({}) },
    $queryRaw: vi.fn().mockResolvedValue([]),
  };
  let attempt = 0;
  const db = {
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) => {
      const first = attempt++ === 0;
      return callback({
        ...base,
        mediaAsset: {
          findUnique: () =>
            Promise.resolve({
              id,
              ownerId: owner,
              status: "PENDING",
              expiresAt: new Date(Date.now() + 300000),
              contentType: "image/png",
              sizeBytes: png.length,
            }),
          update: ({ data }: { data: { objectKey: string } }) => {
            if (first) return Promise.reject(new Error("Transaction expired"));
            winner = data.objectKey;
            return Promise.resolve();
          },
        },
      });
    },
  };
  const storage = {
    original: () => Promise.resolve(png),
    store: async (key: string) => {
      keys.push(key);
      if (keys.length === 1) {
        entered();
        await delayed;
      }
    },
    remove: async () => {},
  };
  const service = new MediaService(
    db as never,
    storage as never,
    { media: { mode: "r2-local" } } as never,
  );
  const first = service.run(actor, "MEDIA_COMPLETE", randomUUID(), id);
  await storing;
  await service.run(actor, "MEDIA_COMPLETE", randomUUID(), id);
  release();
  await expect(first).rejects.toBeInstanceOf(ServiceUnavailableException);
  expect(keys).toHaveLength(2);
  expect(keys[0]).not.toBe(keys[1]);
  expect(winner).toBe(keys[1]);
});
