import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, it, expect } from "vitest";
import { createDbClient } from "../src/index.js";
import type { Prisma } from "../src/generated/client.js";
const url = process.env.DATABASE_URL;
if (!url)
  throw new Error("Listing tests require a migrated disposable DATABASE_URL");
const db = createDbClient(url);
const ids: Record<string, string> = {};
let variantId: string;
async function asActor<T>(
  userId: string,
  run: (tx: Prisma.TransactionClient, requestId: string) => Promise<T>,
) {
  const requestId = randomUUID();
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT set_config('evone.actor_id',${userId},true),set_config('evone.request_id',${requestId},true)`;
    return run(tx, requestId);
  });
}
async function draft(complete = false, canonicalId = variantId) {
  return asActor(ids.owner!, (tx) =>
    tx.listing.create({
      data: {
        sellerUserId: ids.owner!,
        slug: `demo-${randomUUID()}`,
        ...(complete
          ? {
              variantId: canonicalId,
              year: 2024,
              odometerKm: 0,
              city: "DEMO City",
              askingPricePaise: 25000000n,
              ownershipCount: 1,
              conditionNotes: "Synthetic notes excluded from audit snapshots",
            }
          : {}),
      },
    }),
  );
}
async function media(ownerId = ids.owner!, ready = true) {
  return db.mediaAsset.create({
    data: {
      ownerId,
      contentType: "image/webp",
      sizeBytes: 12,
      expiresAt: new Date(Date.now() + 300000),
      ...(ready
        ? { status: "READY", objectKey: `ready/synthetic-${randomUUID()}.webp` }
        : {}),
    },
  });
}
async function attach(listingId: string, assetId: string, position = 0) {
  return asActor(ids.owner!, (tx) =>
    tx.listingMedia.create({
      data: {
        listingId,
        mediaAssetId: assetId,
        position,
        alt: "DEMO synthetic vehicle image",
      },
    }),
  );
}
async function transition(
  id: string,
  status: "DRAFT" | "PENDING_REVIEW" | "ARCHIVED" | "SOLD",
  actor = ids.owner!,
) {
  const row = await db.listing.findUniqueOrThrow({ where: { id } });
  return asActor(actor, (tx) =>
    tx.listing.update({
      where: { id, version: row.version },
      data: { status, version: { increment: 1 } },
    }),
  );
}
async function submitted(canonicalId = variantId) {
  const row = await draft(true, canonicalId);
  const asset = await media();
  await attach(row.id, asset.id);
  return transition(row.id, "PENDING_REVIEW");
}
async function review(
  listingId: string,
  decision: "APPROVE" | "REJECT",
  actor = ids.moderator!,
  reason?: string,
  version?: number,
) {
  const row = await db.listing.findUniqueOrThrow({ where: { id: listingId } });
  return asActor(actor, (tx, requestId) =>
    tx.listingReview.create({
      data: {
        listingId,
        listingVersion: version ?? row.version,
        reviewerId: actor,
        decision,
        reason,
        snapshot: { callerPayload: "must not persist" },
        requestId,
      },
    }),
  );
}
beforeAll(async () => {
  for (const [name, role] of [
    ["owner", "USER"],
    ["other", "USER"],
    ["moderator", "MODERATOR"],
    ["admin", "ADMIN"],
    ["editor", "EDITOR"],
  ] as const) {
    ids[name] = (
      await db.user.create({
        data: {
          authIssuer: "https://listing-db.clerk.accounts.dev",
          authProviderId: `synthetic-${randomUUID()}`,
          status: "ACTIVE",
          roles: { create: { role, scopeType: "GLOBAL" } },
        },
      })
    ).id;
  }
  const brand = await db.brand.create({
    data: {
      name: "DEMO Listing Brand",
      slug: `demo-listing-${randomUUID()}`,
      status: "PUBLISHED",
      isDemo: true,
    },
  });
  const model = await db.evModel.create({
    data: {
      brandId: brand.id,
      name: "DEMO Listing Model",
      slug: "demo-model",
      vehicleType: "SCOOTER",
      status: "PUBLISHED",
      isDemo: true,
    },
  });
  variantId = (
    await db.evVariant.create({
      data: {
        modelId: model.id,
        name: "DEMO Unknown Specs",
        slug: "demo-variant",
        status: "PUBLISHED",
        isDemo: true,
      },
    })
  ).id;
});
afterAll(async () => {
  await db.$disconnect();
});
it("requires transaction-local actor/request context and leaves no context in pooled connections", async () => {
  await expect(
    db.listing.create({
      data: { sellerUserId: ids.owner!, slug: `demo-${randomUUID()}` },
    }),
  ).rejects.toThrow(/permission|context/i);
  await draft();
  await expect(
    db.listing.create({
      data: { sellerUserId: ids.owner!, slug: `demo-${randomUUID()}` },
    }),
  ).rejects.toThrow(/permission|context/i);
});
it("creates partial owned demo drafts with atomic redacted version history", async () => {
  const row = await draft();
  expect(row).toMatchObject({
    status: "DRAFT",
    version: 1,
    isDemo: true,
    variantId: null,
    publishedAt: null,
  });
  const history = await db.listingHistory.findUniqueOrThrow({
    where: { listingId_version: { listingId: row.id, version: 1 } },
  });
  expect(history).toMatchObject({
    actorUserId: ids.owner,
    fromStatus: null,
    toStatus: "DRAFT",
    beforeJson: null,
  });
  expect(history.afterJson).toMatchObject({
    id: row.id,
    version: 1,
    mediaIds: [],
  });
  await expect(
    asActor(ids.other!, (tx) =>
      tx.listing.update({
        where: { id: row.id },
        data: { city: "DEMO Other", version: { increment: 1 } },
      }),
    ),
  ).rejects.toThrow(/owner/i);
  await expect(
    asActor(ids.owner!, (tx) =>
      tx.listing.update({
        where: { id: row.id },
        data: { sellerUserId: ids.other!, version: { increment: 1 } },
      }),
    ),
  ).rejects.toThrow(/identity/i);
});
it("rejects invalid numeric/slug values and non-demo creation", async () => {
  await expect(
    asActor(ids.editor!, (tx) =>
      tx.listing.create({
        data: { sellerUserId: ids.editor!, slug: `demo-${randomUUID()}` },
      }),
    ),
  ).rejects.toThrow(/permission/i);
  const dealer = await db.user.create({
    data: {
      authIssuer: "https://listing-db.clerk.accounts.dev",
      authProviderId: randomUUID(),
      status: "ACTIVE",
      roles: {
        create: {
          role: "DEALER_STAFF",
          scopeType: "DEALER",
          scopeId: randomUUID(),
        },
      },
    },
  });
  await expect(
    asActor(dealer.id, (tx) =>
      tx.listing.create({
        data: { sellerUserId: dealer.id, slug: `demo-${randomUUID()}` },
      }),
    ),
  ).rejects.toThrow(/permission/i);

  for (const patch of [
    { year: 1899 },
    { odometerKm: -1 },
    { askingPricePaise: 0n },
    { askingPricePaise: -1n },
    { ownershipCount: 0 },
    { city: "  " },
    { slug: "Not A Slug" },
    { isDemo: false },
  ])
    await expect(
      asActor(ids.owner!, (tx) =>
        tx.listing.create({
          data: {
            sellerUserId: ids.owner!,
            slug: `demo-${randomUUID()}`,
            ...patch,
          },
        }),
      ),
    ).rejects.toThrow();
});
it("requires full fields, canonical published variant and validated owned media to submit", async () => {
  const partial = await draft();
  await expect(transition(partial.id, "PENDING_REVIEW")).rejects.toThrow(
    /Complete listing/,
  );
  const full = await draft(true);
  await expect(transition(full.id, "PENDING_REVIEW")).rejects.toThrow(/media/i);
  const asset = await media();
  await attach(full.id, asset.id);
  const hidden = await db.evVariant.create({
    data: {
      modelId: (
        await db.evVariant.findUniqueOrThrow({ where: { id: variantId } })
      ).modelId,
      name: "DEMO Draft",
      slug: `demo-draft-${randomUUID()}`,
    },
  });
  await asActor(ids.owner!, (tx) =>
    tx.listing.update({
      where: { id: full.id },
      data: { variantId: hidden.id, version: { increment: 1 } },
    }),
  );
  await expect(transition(full.id, "PENDING_REVIEW")).rejects.toThrow(
    /canonical/i,
  );
});
it("prevents cross-owner/unvalidated/duplicate/invalid media and bumps parent revision", async () => {
  const row = await draft(true);
  const foreign = await media(ids.other),
    pending = await media(ids.owner, false),
    ready = await media();
  await expect(attach(row.id, foreign.id)).rejects.toThrow(/owner media/i);
  await expect(attach(row.id, pending.id)).rejects.toThrow(/owner media/i);
  await expect(attach(row.id, ready.id, 12)).rejects.toThrow(
    /listing_media_values/,
  );
  await attach(row.id, ready.id);
  expect(
    (await db.listing.findUniqueOrThrow({ where: { id: row.id } })).version,
  ).toBe(2);
  await expect(attach(row.id, ready.id, 1)).rejects.toThrow();
  const history = await db.listingHistory.findUniqueOrThrow({
    where: { listingId_version: { listingId: row.id, version: 2 } },
  });
  expect(history.beforeJson).toMatchObject({ mediaIds: [] });
  expect(history.afterJson).toMatchObject({ mediaIds: [ready.id] });
  await expect(
    db.mediaAsset.update({
      where: { id: ready.id },
      data: { status: "REJECTED", objectKey: null },
    }),
  ).rejects.toThrow(/immutable/);
  await expect(
    asActor(ids.other!, (tx) =>
      tx.listingMedia.deleteMany({ where: { listingId: row.id } }),
    ),
  ).rejects.toThrow(/owner draft/i);
});
it("freezes submitted edits and requires an actual separate moderator review to publish", async () => {
  const row = await submitted();
  await expect(
    asActor(ids.owner!, (tx) =>
      tx.listing.update({
        where: { id: row.id },
        data: { city: "DEMO Changed", version: { increment: 1 } },
      }),
    ),
  ).rejects.toThrow(/transition/i);
  await expect(
    asActor(ids.owner!, (tx) =>
      tx.listing.update({
        where: { id: row.id },
        data: { status: "PUBLISHED", version: { increment: 1 } },
      }),
    ),
  ).rejects.toThrow(/permission/i);
  await expect(
    asActor(ids.moderator!, (tx) =>
      tx.listing.update({
        where: { id: row.id },
        data: { status: "PUBLISHED", version: { increment: 1 } },
      }),
    ),
  ).rejects.toThrow(/review/i);
  await expect(review(row.id, "APPROVE", ids.editor)).rejects.toThrow(
    /permission/i,
  );
  await db.roleAssignment.create({
    data: { userId: ids.owner!, role: "ADMIN", scopeType: "GLOBAL" },
  });
  await expect(review(row.id, "APPROVE", ids.owner)).rejects.toThrow(
    /Separate reviewer/i,
  );
});
it("rejects with reason then allows revision/resubmission and immutable reviewed publication", async () => {
  const row = await submitted();
  await expect(
    review(row.id, "REJECT", ids.moderator, "short"),
  ).rejects.toThrow(/listing_review_values/);
  await review(
    row.id,
    "REJECT",
    ids.moderator,
    "Replace the unclear synthetic photo.",
  );
  expect(
    (await db.listing.findUniqueOrThrow({ where: { id: row.id } })).status,
  ).toBe("REJECTED");
  await transition(row.id, "DRAFT");
  await transition(row.id, "PENDING_REVIEW");
  const evidence = await review(row.id, "APPROVE");
  const published = await db.listing.findUniqueOrThrow({
    where: { id: row.id },
  });
  expect(published.status).toBe("PUBLISHED");
  expect(published.publishedAt).toBeInstanceOf(Date);
  expect(evidence.snapshot).toMatchObject({
    status: "PENDING_REVIEW",
    askingPricePaise: "25000000",
  });
  expect(JSON.stringify(evidence.snapshot)).not.toContain("callerPayload");
  expect(JSON.stringify(evidence.snapshot)).not.toContain("Synthetic notes");
  await expect(
    db.evVariant.update({
      where: { id: variantId },
      data: { status: "ARCHIVED" },
    }),
  ).rejects.toThrow(/Published listings/);
  await transition(row.id, "ARCHIVED");
  await transition(row.id, "DRAFT");
  await transition(row.id, "PENDING_REVIEW");
  await review(row.id, "APPROVE");
  await transition(row.id, "SOLD");
  await expect(transition(row.id, "DRAFT")).rejects.toThrow(/transition/i);
});
it("sensitive published edits unpublish for a new review instead of silently changing public content", async () => {
  const row = await submitted();
  await review(row.id, "APPROVE");
  await expect(
    asActor(ids.owner!, (tx) =>
      tx.listing.update({
        where: { id: row.id },
        data: { askingPricePaise: 26000000n, version: { increment: 1 } },
      }),
    ),
  ).rejects.toThrow(/transition/i);
  const edited = await asActor(ids.owner!, (tx) =>
    tx.listing.update({
      where: { id: row.id },
      data: {
        status: "PENDING_REVIEW",
        askingPricePaise: 26000000n,
        version: { increment: 1 },
      },
    }),
  );
  expect(edited.publishedAt).toBeNull();
  await review(row.id, "APPROVE");
  const histories = await db.listingHistory.findMany({
    where: { listingId: row.id },
    orderBy: { version: "asc" },
  });
  expect(
    histories.some(
      (h) =>
        JSON.stringify(h.beforeJson).includes('"25000000"') &&
        JSON.stringify(h.afterJson).includes('"26000000"'),
    ),
  ).toBe(true);
});
it("rejects stale revisions and serializes competing reviews", async () => {
  const row = await submitted();
  await expect(
    review(row.id, "APPROVE", ids.admin, undefined, row.version - 1),
  ).rejects.toMatchObject({ code: "P2034" });
  const results = await Promise.allSettled([
    review(row.id, "APPROVE", ids.admin),
    review(
      row.id,
      "REJECT",
      ids.moderator,
      "Review collision, keep current version.",
    ),
  ]);
  expect(
    results.filter((result) => result.status === "fulfilled"),
  ).toHaveLength(1);
  expect(await db.listingReview.count({ where: { listingId: row.id } })).toBe(
    1,
  );
});
it("review/history mutations and deletion probes always roll back", async () => {
  const row = await submitted();
  const evidence = await review(row.id, "APPROVE");
  await expect(
    db.$transaction(async (tx) => {
      await tx.listingReview.update({
        where: { id: evidence.id },
        data: { reason: "Changed evidence" },
      });
      throw new Error("Unexpected mutation; roll back");
    }),
  ).rejects.toThrow(/append-only/);
  await expect(
    db.$transaction(async (tx) => {
      await tx.listingHistory.deleteMany({ where: { listingId: row.id } });
      throw new Error("Unexpected deletion; roll back");
    }),
  ).rejects.toThrow(/append-only/);
  await expect(
    asActor(ids.owner!, (tx) => tx.listing.delete({ where: { id: row.id } })),
  ).rejects.toThrow(/Retain listing evidence/);
});
it("history failure rolls back its listing mutation", async () => {
  const id = randomUUID();
  await expect(
    asActor(ids.owner!, async (tx) => {
      await tx.$executeRawUnsafe(
        "ALTER TABLE listing_history ADD CONSTRAINT synthetic_history_outage CHECK (false) NOT VALID",
      );
      await tx.listing.create({
        data: { id, sellerUserId: ids.owner!, slug: `demo-${randomUUID()}` },
      });
      throw new Error("Unexpected evidence write; roll back");
    }),
  ).rejects.toThrow(/synthetic_history_outage/);
  expect(await db.listing.findUnique({ where: { id } })).toBeNull();
  expect(await db.listingHistory.count({ where: { listingId: id } })).toBe(0);
});
it("rejects revoked, expired and suspended actors", async () => {
  for (const data of [
    { active: false },
    { active: true, expiresAt: new Date(0) },
  ]) {
    await db.roleAssignment.updateMany({ where: { userId: ids.other }, data });
    await expect(
      asActor(ids.other!, (tx) =>
        tx.listing.create({
          data: { sellerUserId: ids.other!, slug: `demo-${randomUUID()}` },
        }),
      ),
    ).rejects.toThrow(/permission/i);
  }
  await db.roleAssignment.updateMany({
    where: { userId: ids.other },
    data: { active: true, expiresAt: null },
  });
  await db.user.update({
    where: { id: ids.other },
    data: { status: "SUSPENDED" },
  });
  await expect(
    asActor(ids.other!, (tx) =>
      tx.listing.create({
        data: { sellerUserId: ids.other!, slug: `demo-${randomUUID()}` },
      }),
    ),
  ).rejects.toThrow(/permission/i);
});

it("rejects forged history inserts with or without a transaction context", async () => {
  const row = await draft();
  const data = {
    listingId: row.id,
    version: row.version + 1,
    actorUserId: ids.owner!,
    toStatus: "DRAFT" as const,
    afterJson: { arbitraryPrivateText: "not retained" },
    requestId: randomUUID(),
  };
  await expect(db.listingHistory.create({ data })).rejects.toThrow(
    /permission|context/i,
  );
  await expect(
    asActor(ids.owner!, (tx, requestId) =>
      tx.listingHistory.create({ data: { ...data, requestId } }),
    ),
  ).rejects.toThrow(/generated listing history/i);
  expect(await db.listingHistory.count({ where: { listingId: row.id } })).toBe(
    1,
  );
});
it("serializes variant archival against approval rather than publishing an archived variant", async () => {
  const modelId = (
    await db.evVariant.findUniqueOrThrow({ where: { id: variantId } })
  ).modelId;
  const canonical = await db.evVariant.create({
    data: {
      modelId,
      name: "DEMO Race Variant",
      slug: `demo-race-${randomUUID()}`,
      status: "PUBLISHED",
      isDemo: true,
    },
  });
  const listing = await draft(true);
  await asActor(ids.owner!, (tx) =>
    tx.listing.update({
      where: { id: listing.id },
      data: { variantId: canonical.id, version: { increment: 1 } },
    }),
  );
  const photo = await media();
  await attach(listing.id, photo.id);
  await transition(listing.id, "PENDING_REVIEW");
  let archived: () => void = () => {},
    release: () => void = () => {};
  const ready = new Promise<void>((resolve) => {
      archived = resolve;
    }),
    gate = new Promise<void>((resolve) => {
      release = resolve;
    });
  const archive = db.$transaction(async (tx) => {
    await tx.evVariant.update({
      where: { id: canonical.id },
      data: { status: "ARCHIVED" },
    });
    archived();
    await gate;
  });
  await ready;
  let settled = false;
  const approval = review(listing.id, "APPROVE")
    .then(
      (value) => ({ ok: true, value }),
      (error) => ({ ok: false, error: error as unknown }),
    )
    .finally(() => {
      settled = true;
    });
  let blocked = false;
  try {
    for (let i = 0; i < 100; i++) {
      const rows = await db.$queryRaw<
        { waiting: boolean }[]
      >`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%listing_reviews%') AS waiting`;
      if (rows[0]?.waiting) {
        blocked = true;
        break;
      }
      if (settled) break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    expect(blocked).toBe(true);
  } finally {
    release();
    await archive;
  }
  expect((await approval).ok).toBe(false);
  expect(
    (await db.listing.findUniqueOrThrow({ where: { id: listing.id } })).status,
  ).toBe("PENDING_REVIEW");
  expect(
    (await db.evVariant.findUniqueOrThrow({ where: { id: canonical.id } }))
      .status,
  ).toBe("ARCHIVED");
  expect(
    await db.listingReview.count({ where: { listingId: listing.id } }),
  ).toBe(0);
});

it("blocks archival that starts while an approval still holds canonical share locks", async () => {
  const modelId = (
    await db.evVariant.findUniqueOrThrow({ where: { id: variantId } })
  ).modelId;
  const canonical = await db.evVariant.create({
    data: {
      modelId,
      name: "DEMO Reverse Race",
      slug: `demo-race-${randomUUID()}`,
      status: "PUBLISHED",
      isDemo: true,
    },
  });
  const row = await submitted(canonical.id);
  let approved: () => void = () => {},
    release: () => void = () => {};
  const ready = new Promise<void>((resolve) => {
      approved = resolve;
    }),
    gate = new Promise<void>((resolve) => {
      release = resolve;
    });
  const approval = asActor(ids.admin!, async (tx, requestId) => {
    await tx.listingReview.create({
      data: {
        listingId: row.id,
        listingVersion: row.version,
        reviewerId: ids.admin!,
        decision: "APPROVE",
        snapshot: {},
        requestId,
      },
    });
    approved();
    await gate;
  });
  await ready;
  let settled = false;
  const archival = db.evVariant
    .update({ where: { id: canonical.id }, data: { status: "ARCHIVED" } })
    .then(
      (value) => ({ ok: true, value }),
      (error) => ({ ok: false, error: error as unknown }),
    )
    .finally(() => {
      settled = true;
    });
  let blocked = false;
  try {
    for (let i = 0; i < 100; i++) {
      const rows = await db.$queryRaw<
        { waiting: boolean }[]
      >`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%ev_variants%') AS waiting`;
      if (rows[0]?.waiting) {
        blocked = true;
        break;
      }
      if (settled) break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    expect(blocked).toBe(true);
  } finally {
    release();
    await approval;
  }
  expect((await archival).ok).toBe(false);
  expect(
    (await db.listing.findUniqueOrThrow({ where: { id: row.id } })).status,
  ).toBe("PUBLISHED");
  expect(
    (await db.evVariant.findUniqueOrThrow({ where: { id: canonical.id } }))
      .status,
  ).toBe("PUBLISHED");
});

it("does not approve a listing after its seller is suspended", async () => {
  const row = await submitted();
  await db.user.update({
    where: { id: ids.owner },
    data: { status: "SUSPENDED" },
  });
  try {
    await expect(review(row.id, "APPROVE")).rejects.toThrow(/Active seller/);
  } finally {
    await db.user.update({
      where: { id: ids.owner },
      data: { status: "ACTIVE" },
    });
  }
  expect(
    (await db.listing.findUniqueOrThrow({ where: { id: row.id } })).status,
  ).toBe("PENDING_REVIEW");
});
