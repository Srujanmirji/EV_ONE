import sharp from "sharp";
import { MAX_MEDIA_BYTES } from "@evone/contracts";

export class InvalidImage extends Error {}

/** Bounded decoding and re-encoding; originals are never served. Not an AV scan. */
export async function sanitizeImage(
  bytes: Buffer,
  contentType: string,
): Promise<Buffer> {
  const format = contentType.slice(6);
  const magic =
    format === "png"
      ? bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : format === "jpeg"
        ? bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
        : format === "webp" &&
          bytes.toString("ascii", 0, 4) === "RIFF" &&
          bytes.toString("ascii", 8, 12) === "WEBP";
  if (!magic || bytes.length > MAX_MEDIA_BYTES || bytes.length === 0)
    throw new InvalidImage();
  try {
    const image = sharp(bytes, {
      limitInputPixels: 16_000_000,
      failOn: "warning",
      animated: true,
    });
    const metadata = await image.metadata();
    if (metadata.format !== format || (metadata.pages ?? 1) !== 1)
      throw new InvalidImage();
    const output = await image
      .rotate()
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .timeout({ seconds: 3 })
      .toBuffer();
    if (output.length > MAX_MEDIA_BYTES) throw new InvalidImage();
    return output;
  } catch {
    throw new InvalidImage();
  }
}
