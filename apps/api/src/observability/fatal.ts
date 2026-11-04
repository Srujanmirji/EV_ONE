import {
  closeTelemetry,
  reportError,
  type TelemetryEvent,
} from "./telemetry.js";

/** Replace Node's raw exception output, which can contain credentials or PII. */
export function installFatalHandlers(): void {
  let stopping = false;
  const stop = (event: TelemetryEvent) => {
    if (stopping) return;
    stopping = true;
    reportError(event);
    void closeTelemetry().finally(() => process.exit(1));
  };
  process.on("uncaughtException", () => stop("process.uncaught_exception"));
  process.on("unhandledRejection", () => stop("process.unhandled_rejection"));
}
