export type EntityId = string;

export type ISODateString = string;

export type Timestamps = {
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export function nowIso(): ISODateString {
  return new Date().toISOString();
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** RFC 4122 UUID v4 — works with Supabase uuid/text columns. */
export function createUuid(): EntityId {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return fallbackUuid();
}

function fallbackUuid(): EntityId {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

/** @deprecated Use createUuid(). Prefix is ignored — kept for call-site compatibility. */
export function createId(_prefix?: string): EntityId {
  return createUuid();
}

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
