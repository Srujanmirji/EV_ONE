/**
 * Structured JSON log lines. Callers pass identifiers only (event name,
 * job id, attempt); payloads are never logged because they may hold
 * personal data (03_Engineering/06_notifications_observability.md).
 */
export type LogFields = Record<
  string,
  string | number | boolean | null | undefined
>;
export interface Logger {
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
}

export function jsonLogger(
  write: (line: string) => void = (l) => process.stdout.write(`${l}\n`),
): Logger {
  const emit = (level: string, event: string, fields: LogFields = {}) =>
    write(
      JSON.stringify({
        time: new Date().toISOString(),
        level,
        event,
        ...fields,
      }),
    );
  return {
    info: (e, f) => emit("info", e, f),
    warn: (e, f) => emit("warn", e, f),
    error: (e, f) => emit("error", e, f),
  };
}

export const silentLogger: Logger = { info() {}, warn() {}, error() {} };
