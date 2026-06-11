/** Firestore rejects `undefined` anywhere in document payloads. */
export function stripUndefinedDeep<T>(value: T): T {
  if (value === undefined) {
    return value;
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as T;
  }

  const record = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(record)) {
    if (nested === undefined) continue;
    result[key] = stripUndefinedDeep(nested);
  }
  return result as T;
}
