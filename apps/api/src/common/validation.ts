import { BadRequestException } from "@nestjs/common";
import type { z } from "zod";

/** 400 rendered as `VALIDATION_ERROR` with per-field messages. */
export class RequestValidationError extends BadRequestException {
  constructor(readonly fields: Record<string, string>) {
    super("Check the highlighted fields");
  }
}

export function parseRequest<T extends z.ZodType>(
  schema: T,
  input: unknown,
): z.infer<T> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key =
      issue.path.length > 0
        ? issue.path.join(".")
        : issue.code === "unrecognized_keys"
          ? issue.keys.join(",")
          : "request";
    fields[key] ??=
      issue.code === "unrecognized_keys" ? "Unknown parameter" : issue.message;
  }
  throw new RequestValidationError(fields);
}
