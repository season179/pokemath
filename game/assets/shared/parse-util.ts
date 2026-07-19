// Shared structural-validation helpers for the question-bank trust boundary.
// Both schema parsers (v1 in question-bank-validate.ts, v2 in
// question-v2-validate.ts) build on these so diagnostics stay uniform.
// Internal module: intentionally not re-exported from index.ts.

export function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function rejectUnknownFields(
  value: Record<string, unknown>,
  allowed: Set<string>,
  label: string,
): void {
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length > 0) throw new Error(`${label} has unknown field(s): ${unknown.join(", ")}`);
}

export function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

export function requiredInteger(value: unknown, label: string): number {
  if (!Number.isInteger(value)) throw new Error(`${label} must be an integer`);
  return Number(value);
}

/** Require one value out of a fixed string enum, listing the valid values. */
export function requiredEnum<const T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string,
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new Error(`${label} must be one of: ${allowed.join(", ")}`);
  }
  return value as T;
}
