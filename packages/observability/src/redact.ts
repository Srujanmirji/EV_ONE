/**
 * Removes personal data and secrets before anything is logged or sent to
 * error tracking (03_Engineering/03_security_auth_privacy.md: "redacted
 * structured logging"; 06: never log phone, email, lead text or secrets).
 *
 * Two layers:
 *  1. by key: values under sensitive field names are replaced entirely;
 *  2. by content: emails, Indian mobile numbers, bearer tokens, JWTs and
 *     credentials inside URLs are masked wherever they appear in strings.
 * Redaction errs on the side of removing too much.
 */
export const REDACTED = "[redacted]";

const SENSITIVE_KEY =
  /pass(word)?|secret|token|auth(orization)?|cookie|session|api[-_]?key|dsn|credential|private|e-?mail|phone|mobile|whats[-_]?app|aadhaa?r|\bpan\b|pan[-_]?(no|number)|address|pin[-_]?code|postal|dob|birth|full[-_]?name|first[-_]?name|last[-_]?name|contact|message|notes?|free[-_]?text|(^|[-_])ip([-_]?addr(ess)?)?$|lat(itude)?$|lon(g|gitude)?$|location|card|account[-_]?(no|number)|ifsc|upi/i;

const PATTERNS: [RegExp, string][] = [
  // scheme://user:password@host → keep scheme and host, drop credentials.
  [/\b([a-z][a-z0-9+.-]*:\/\/)[^\s/:@]+:[^\s/@]+@/gi, `$1${REDACTED}@`],
  [/\bBearer\s+[A-Za-z0-9._~+/=-]+/g, `Bearer ${REDACTED}`],
  [/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, REDACTED],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, REDACTED],
  // Indian mobile numbers: optional +91/0 prefix, 10 digits starting 6–9.
  [/(?<![\d-])(?:\+91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}(?![\d-])/g, REDACTED],
  // Aadhaar-like 12-digit groups (4-4-4).
  [/(?<!\d)\d{4}[\s-]\d{4}[\s-]\d{4}(?!\d)/g, REDACTED],
];

/** camelCase → snake_case so word-boundary rules work for both styles. */
export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(
    key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase(),
  );
}

export function redactString(value: string): string {
  return PATTERNS.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    value,
  );
}

/** Deep copy with sensitive keys and patterns redacted. Cycles are cut. */
export function redact<T>(value: T, seen = new WeakSet<object>()): T {
  if (typeof value === "string") return redactString(value) as T;
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[circular]" as T;
  seen.add(value);
  if (Array.isArray(value))
    return (value as unknown[]).map((item) => redact(item, seen)) as T;
  if (value instanceof Error) {
    return { name: value.name, message: redactString(value.message) } as T;
  }
  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value)) {
    out[key] = isSensitiveKey(key) ? REDACTED : redact(inner, seen);
  }
  return out as T;
}
