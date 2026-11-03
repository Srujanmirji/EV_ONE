"use client";

import { type KeyboardEvent, useId, useRef, useState } from "react";
import { buttonClasses } from "./button";
import { cn } from "./cn";

export interface GalleryImage {
  src: string;
  /** Required: describe what the photo shows, not "image". */
  alt: string;
  width: number;
  height: number;
}

export interface GalleryProps {
  images: GalleryImage[];
  /** Accessible name for the whole gallery, e.g. "Photos of DEMO Hatch". */
  label: string;
  /** Shown when there are no licensed photos. Never use stock fill-ins. */
  emptyText?: string;
}

/**
 * Photo gallery: main image, previous/next buttons and a thumbnail strip
 * (arrow keys move between thumbnails). The position is announced politely.
 * With no images it renders an honest empty panel instead of placeholders.
 */
export function Gallery({
  images,
  label,
  emptyText = "No photos yet.",
}: GalleryProps) {
  const [index, setIndex] = useState(0);
  const statusId = useId();
  const thumbs = useRef<(HTMLButtonElement | null)[]>([]);

  if (images.length === 0) {
    return (
      <figure
        aria-label={label}
        className="flex aspect-[16/9] w-full items-center justify-center rounded-card border border-dashed border-line bg-mist p-6 text-center"
      >
        <figcaption className="max-w-prose text-secondary">
          {emptyText}
        </figcaption>
      </figure>
    );
  }

  const count = images.length;
  const current = images[index]!;
  const go = (next: number) => setIndex((next + count) % count);

  const onThumbKey = (event: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const delta =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (i + delta + count) % count;
    setIndex(next);
    thumbs.current[next]?.focus();
  };

  return (
    <section
      aria-label={label}
      aria-roledescription="gallery"
      className="flex flex-col gap-3"
    >
      <figure className="overflow-hidden rounded-card bg-mist">
        <img
          src={current.src}
          alt={current.alt}
          width={current.width}
          height={current.height}
          className="aspect-[16/9] w-full object-cover"
        />
      </figure>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p id={statusId} aria-live="polite" className="text-sm text-secondary">
          Photo {index + 1} of {count}
        </p>
        {count > 1 ? (
          <div className="flex gap-2">
            <button
              type="button"
              className={buttonClasses("secondary")}
              onClick={() => go(index - 1)}
            >
              Previous photo
            </button>
            <button
              type="button"
              className={buttonClasses("secondary")}
              onClick={() => go(index + 1)}
            >
              Next photo
            </button>
          </div>
        ) : null}
      </div>
      {count > 1 ? (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, i) => (
            <li key={image.src} className="shrink-0">
              <button
                ref={(el) => {
                  thumbs.current[i] = el;
                }}
                type="button"
                aria-label={`Show photo ${i + 1}: ${image.alt}`}
                aria-current={i === index ? "true" : undefined}
                tabIndex={i === index ? 0 : -1}
                onClick={() => setIndex(i)}
                onKeyDown={(event) => onThumbKey(event, i)}
                className={cn(
                  "block size-16 overflow-hidden rounded-field border-2",
                  i === index ? "border-ink" : "border-transparent",
                )}
              >
                <img
                  src={image.src}
                  alt=""
                  width={64}
                  height={64}
                  className="size-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
