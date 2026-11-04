import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { sanitizeImage, InvalidImage } from "./image.js";
import { MediaUploadRequest, MAX_MEDIA_BYTES } from "@evone/contracts";

describe("private image validation", () => {
  for (const format of ["png", "jpeg", "webp"] as const)
    it(`re-encodes synthetic ${format} and strips metadata`, async () => {
      const original = await sharp({
        create: { width: 1500, height: 2, channels: 3, background: "red" },
      })
        .withMetadata()
        .toFormat(format)
        .toBuffer();
      const result = await sanitizeImage(original, `image/${format}`);
      const meta = await sharp(result).metadata();
      expect(meta.format).toBe("webp");
      expect(meta.width).toBe(1200);
      expect(meta.exif).toBeUndefined();
      expect(meta.icc).toBeUndefined();
    });
  it("rejects renamed SVG, corrupt images, MIME mismatch and oversized input", async () => {
    const png = await sharp({
      create: { width: 1, height: 1, channels: 3, background: "red" },
    })
      .png()
      .toBuffer();
    for (const [bytes, type] of [
      [Buffer.from('<svg onload="alert(1)"/>'), "image/png"],
      [Buffer.from([255, 216, 255]), "image/jpeg"],
      [png, "image/jpeg"],
      [Buffer.alloc(MAX_MEDIA_BYTES + 1), "image/png"],
    ] as const) {
      await expect(sanitizeImage(bytes, type)).rejects.toBeInstanceOf(
        InvalidImage,
      );
    }
  });
  it("rejects excessive decoded pixels and animated images", async () => {
    const huge = await sharp({
      create: { width: 4001, height: 4001, channels: 3, background: "red" },
    })
      .png()
      .toBuffer();
    await expect(sanitizeImage(huge, "image/png")).rejects.toBeInstanceOf(
      InvalidImage,
    );
    const pixels = Buffer.from([
      ...Array<number[]>(4).fill([255, 0, 0, 255]).flat(),
      ...Array<number[]>(4).fill([0, 0, 255, 255]).flat(),
    ]);
    const animation = await sharp(pixels, {
      raw: { width: 2, height: 4, pageHeight: 2, channels: 4 },
    })
      .webp({ loop: 0, delay: [100, 100] })
      .toBuffer();
    await expect(sanitizeImage(animation, "image/webp")).rejects.toBeInstanceOf(
      InvalidImage,
    );
  });
  it("rejects unsupported types, invalid size and caller keys", () => {
    for (const body of [
      { contentType: "image/svg+xml", sizeBytes: 1 },
      { contentType: "image/png", sizeBytes: 0 },
      { contentType: "image/png", sizeBytes: MAX_MEDIA_BYTES + 1 },
      { contentType: "image/png", sizeBytes: 3, key: "other-owner" },
    ])
      expect(MediaUploadRequest.safeParse(body).success).toBe(false);
  });
});
