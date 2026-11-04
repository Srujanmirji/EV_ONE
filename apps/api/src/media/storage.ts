import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { MAX_MEDIA_BYTES } from "@evone/contracts";
import { API_CONFIG } from "../config/config.token.js";
import type { ApiConfig } from "../config/env.js";
import { InvalidImage } from "./image.js";

@Injectable()
export class MediaStorage {
  private readonly client: S3Client | undefined;
  private readonly bucket: string | undefined;
  constructor(@Inject(API_CONFIG) config: ApiConfig) {
    if (config.media.mode === "r2-local") {
      const { endpoint, bucket, accessKeyId, secretAccessKey } = config.media;
      this.bucket = bucket;
      this.client = new S3Client({
        endpoint,
        region: "auto",
        forcePathStyle: true,
        credentials: { accessKeyId, secretAccessKey },
        maxAttempts: 1,
        requestChecksumCalculation: "WHEN_REQUIRED",
      });
    }
  }
  private connection() {
    if (!this.client || !this.bucket) throw new ServiceUnavailableException();
    return { client: this.client, Bucket: this.bucket };
  }
  async uploadUrl(Key: string, ContentType: string, ContentLength: number) {
    const { client, Bucket } = this.connection();
    return getSignedUrl(
      client,
      new PutObjectCommand({ Bucket, Key, ContentType, ContentLength }),
      {
        expiresIn: 300,
        signableHeaders: new Set(["content-type", "content-length"]),
      },
    );
  }
  async original(
    Key: string,
    contentType: string,
    sizeBytes: number,
  ): Promise<Buffer> {
    const { client, Bucket } = this.connection();
    const object = await client.send(new GetObjectCommand({ Bucket, Key }), {
      abortSignal: AbortSignal.timeout(5000),
    });
    if (!object.Body) throw new InvalidImage();
    try {
      if (
        object.ContentLength !== sizeBytes ||
        object.ContentType !== contentType
      )
        throw new InvalidImage();
      const chunks: Buffer[] = [];
      let length = 0;
      for await (const chunk of object.Body as AsyncIterable<Uint8Array>) {
        length += chunk.length;
        if (length > sizeBytes || length > MAX_MEDIA_BYTES)
          throw new InvalidImage();
        chunks.push(Buffer.from(chunk));
      }
      if (length !== sizeBytes) throw new InvalidImage();
      return Buffer.concat(chunks, length);
    } finally {
      // Close on invalid headers/overflow too; never leave an unread object stream.
      if ("destroy" in object.Body && typeof object.Body.destroy === "function")
        object.Body.destroy();
    }
  }
  async store(Key: string, Body: Buffer) {
    const { client, Bucket } = this.connection();
    await client.send(
      new PutObjectCommand({
        Bucket,
        Key,
        Body,
        ContentType: "image/webp",
        CacheControl: "private, no-store",
      }),
      { abortSignal: AbortSignal.timeout(5000) },
    );
  }
  async readUrl(Key: string) {
    const { client, Bucket } = this.connection();
    return getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket,
        Key,
        ResponseContentType: "image/webp",
        ResponseCacheControl: "private, no-store",
      }),
      { expiresIn: 60 },
    );
  }
  async remove(Key: string) {
    const { client, Bucket } = this.connection();
    await client.send(new DeleteObjectCommand({ Bucket, Key }), {
      abortSignal: AbortSignal.timeout(2000),
    });
  }
}
