/**
 * Runtime array guards for persisted / repository values.
 * Hermes throws "TypeError: iterator method is not callable" when spreading
 * or for-of iterating a non-iterable (plain object, number, etc.).
 */

export function asArray<T>(value: unknown, fallback: T[] = []): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

export function ensureArray<T>(value: unknown, label: string): T[] {
  if (Array.isArray(value)) return value as T[];
  if (__DEV__) {
    console.warn(`[Voxa] Expected array for ${label}, got`, {
      type: typeof value,
      constructor:
        value != null && typeof value === 'object'
          ? (value as { constructor?: { name?: string } }).constructor?.name
          : undefined,
      isNull: value == null,
    });
  }
  return [];
}
