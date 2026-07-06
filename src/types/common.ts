export type EntityId = string;

export type ISODateString = string;

export type Timestamps = {
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export function nowIso(): ISODateString {
  return new Date().toISOString();
}

export function createId(prefix: string): EntityId {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
