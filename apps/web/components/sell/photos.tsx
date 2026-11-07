"use client";
import { useEffect, useState } from "react";
import { Button, TextField, Skeleton } from "@evone/ui";
import {
  MediaUploadResponse,
  MediaCompleteResponse,
  MediaReadResponse,
  MAX_MEDIA_BYTES,
} from "@evone/contracts";
import type { SellerListing } from "@evone/contracts";
import type { SellerRequest } from "@/lib/sell/request";

function PrivatePhoto({
  assetId,
  alt,
  request,
}: {
  assetId: string;
  alt: string;
  request: SellerRequest;
}) {
  const [url, setUrl] = useState<string | null>(null),
    [failed, setFailed] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    void request(`/media/${assetId}/read-url`)
      .then((data) => {
        if (active) {
          setUrl(MediaReadResponse.parse(data).data.readUrl);
          setFailed(false);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [assetId, request, revision]);
  return (
    <div>
      {url && !failed ? ( // Private bearer URLs need native no-referrer images, not a shared image proxy/cache.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={alt}
          referrerPolicy="no-referrer"
          className="aspect-video w-full rounded-card object-cover"
          onError={() => setFailed(true)}
        />
      ) : failed ? (
        <p className="text-sm text-secondary">Photo preview is unavailable.</p>
      ) : (
        <Skeleton label="Loading private photo" />
      )}
      {failed ? (
        <Button
          variant="secondary"
          onClick={() => setRevision((value) => value + 1)}
        >
          Refresh preview
        </Button>
      ) : null}
    </div>
  );
}
export function ListingPhotos({
  listing,
  request,
  mutate,
  onBusy,
  readonly = false,
}: {
  listing: SellerListing;
  request: SellerRequest;
  mutate: (
    operation: (row: SellerListing) => Promise<unknown>,
  ) => Promise<SellerListing | null>;
  onBusy: (busy: boolean) => void;
  readonly?: boolean;
}) {
  const [alt, setAlt] = useState(""),
    [message, setMessage] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const operation = async (label: string, work: () => Promise<void>) => {
    setBusy(true);
    onBusy(true);
    setMessage(label);
    setError(null);
    try {
      await work();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Photo operation failed. Try again.",
      );
    } finally {
      setBusy(false);
      onBusy(false);
      setMessage(null);
    }
  };
  return (
    <div className="space-y-6">
      <p className="text-secondary">
        Add 1–12 vehicle photos. JPEG, PNG or WebP, up to 5 MiB each. Remove
        number plates, people, documents and addresses first. Validation does
        not certify photo rights or vehicle condition.
      </p>
      {!readonly ? (
        <>
          <TextField
            label="Describe the next photo"
            hint="A useful description, such as the view shown. This becomes its alternative text."
            value={alt}
            maxLength={300}
            disabled={busy}
            onChange={(event) => setAlt(event.target.value)}
          />
          <TextField
            label="Upload a vehicle photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy || listing.media.length >= 12}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              if (!alt.trim()) {
                setError("Describe the photo before uploading it.");
                return;
              }
              if (
                !["image/jpeg", "image/png", "image/webp"].includes(
                  file.type,
                ) ||
                file.size < 1 ||
                file.size > MAX_MEDIA_BYTES
              ) {
                setError("Choose a JPEG, PNG or WebP image up to 5 MiB.");
                return;
              }
              void operation("Uploading and validating photo…", async () => {
                const upload = MediaUploadResponse.parse(
                  await request("/media/presign", "POST", {
                    contentType: file.type,
                    sizeBytes: file.size,
                  }),
                ).data;
                const put = await fetch(upload.uploadUrl, {
                  method: "PUT",
                  headers: upload.headers,
                  body: file,
                  credentials: "omit",
                  signal: AbortSignal.timeout(60000),
                });
                if (!put.ok)
                  throw new Error(
                    "The private upload failed. Check the storage connection and retry.",
                  );
                const complete = MediaCompleteResponse.parse(
                  await request(`/media/${upload.id}/complete`, "POST", {}),
                ).data;
                const updated = await mutate((row) =>
                  request(`/listings/${row.id}/media`, "POST", {
                    version: row.version,
                    mediaAssetId: complete.id,
                    alt: alt.trim(),
                  }),
                );
                if (updated) setAlt("");
              });
            }}
          />
        </>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
      {error ? (
        <p role="alert" className="text-danger">
          {error}
        </p>
      ) : null}
      {!listing.media.length ? (
        <p className="rounded-card bg-mist p-5">
          No photos saved yet. A validated photo is required before submission.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {listing.media.map((photo) => (
            <figure key={photo.id} className="min-w-0 space-y-3">
              <PrivatePhoto
                assetId={photo.mediaAssetId}
                alt={photo.alt}
                request={request}
              />
              <figcaption className="break-words text-sm">
                {photo.alt}
              </figcaption>
              {!readonly ? (
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => {
                    if (
                      !window.confirm(
                        "Remove this photo from the draft? The private upload remains subject to storage cleanup.",
                      )
                    )
                      return;
                    void operation("Removing photo…", async () => {
                      await mutate((row) =>
                        request(
                          `/listings/${row.id}/media/${photo.id}`,
                          "DELETE",
                          { version: row.version },
                        ),
                      );
                    });
                  }}
                >
                  Remove photo
                </Button>
              ) : null}
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
