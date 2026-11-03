import { z } from "zod";

/**
 * Every event the worker can handle, versioned in the name (`*.v1`).
 * Payloads must not carry personal data the worker does not need; they are
 * validated before enqueue and again before handling.
 */
export const eventSchemas = {
  /** Heartbeat used to confirm the worker is consuming (monitoring). */
  "system.ping.v1": z.strictObject({ sentAt: z.iso.datetime() }),
} as const;

export type EventName = keyof typeof eventSchemas;
export type EventPayload<N extends EventName> = z.infer<
  (typeof eventSchemas)[N]
>;

export function isEventName(name: string): name is EventName {
  return Object.hasOwn(eventSchemas, name);
}

/**
 * Idempotency key, used as the BullMQ job id: the same key enqueued twice
 * runs once. BullMQ forbids ":" in custom ids, so keep to a safe alphabet.
 */
export const EventKey = z
  .string()
  .regex(
    /^[A-Za-z0-9._-]{1,128}$/,
    "letters, digits, dot, underscore or hyphen; max 128",
  );
