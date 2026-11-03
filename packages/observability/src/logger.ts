import { redact } from "./redact.js";

export type LogFields = Record<string, unknown>;
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(event: string, fields?: LogFields): void;
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
  /** Same sink, with fields (e.g. requestId, service) on every line. */
  child(bindings: LogFields): Logger;
}

const ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/**
 * One JSON object per line, every field passed through `redact`. Use an
 * event name ("http.request", "job.dead_letter") plus identifiers; never
 * pass request bodies or job payloads.
 */
export function createLogger(options: {
  service: string;
  level?: LogLevel;
  write?: (line: string) => void;
  bindings?: LogFields;
}): Logger {
  const {
    service,
    level = "info",
    write = (l) => process.stdout.write(`${l}\n`),
    bindings = {},
  } = options;
  const emit = (lvl: LogLevel, event: string, fields: LogFields = {}) => {
    if (ORDER[lvl] < ORDER[level]) return;
    const safe = redact({ ...bindings, ...fields });
    write(
      JSON.stringify({
        time: new Date().toISOString(),
        level: lvl,
        service,
        event,
        ...safe,
      }),
    );
  };
  return {
    debug: (e, f) => emit("debug", e, f),
    info: (e, f) => emit("info", e, f),
    warn: (e, f) => emit("warn", e, f),
    error: (e, f) => emit("error", e, f),
    child: (more) =>
      createLogger({
        service,
        level,
        write,
        bindings: { ...bindings, ...more },
      }),
  };
}

export const silentLogger: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
  child: () => silentLogger,
};
