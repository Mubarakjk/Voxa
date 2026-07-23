import { EntityId, ISODateString, createUuid, nowIso } from './common';

export type LifeOSItemStatus = 'active' | 'completed' | 'archived';

export type BucketListItem = {
  id: EntityId;
  userId: EntityId;
  title: string;
  note?: string;
  emoji?: string;
  status: LifeOSItemStatus;
  linkedGoalId?: EntityId;
  linkedMemoryId?: EntityId;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type VisionBoardItem = {
  id: EntityId;
  userId: EntityId;
  title: string;
  description?: string;
  emoji?: string;
  status: LifeOSItemStatus;
  linkedGoalId?: EntityId;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type FutureSelfNote = {
  id: EntityId;
  userId: EntityId;
  title: string;
  body: string;
  targetYear?: number;
  status: LifeOSItemStatus;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type LifeBookEntry = {
  id: EntityId;
  userId: EntityId;
  title: string;
  body: string;
  chapter?: string;
  mood?: string;
  linkedMemoryId?: EntityId;
  savedAt: ISODateString;
};

export type LifeChallenge = {
  id: EntityId;
  userId: EntityId;
  title: string;
  description?: string;
  durationDays: number;
  progressDays: number;
  status: LifeOSItemStatus;
  linkedGoalId?: EntityId;
  startedAt: ISODateString;
  updatedAt: ISODateString;
};

export function createBucketListItem(input: {
  userId: EntityId;
  title: string;
  note?: string;
  emoji?: string;
}): BucketListItem {
  const now = nowIso();
  return {
    id: createUuid(),
    userId: input.userId,
    title: input.title,
    note: input.note,
    emoji: input.emoji,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
}

export function createVisionBoardItem(input: {
  userId: EntityId;
  title: string;
  description?: string;
  emoji?: string;
}): VisionBoardItem {
  const now = nowIso();
  return {
    id: createUuid(),
    userId: input.userId,
    title: input.title,
    description: input.description,
    emoji: input.emoji,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
}

export function createFutureSelfNote(input: {
  userId: EntityId;
  title: string;
  body: string;
  targetYear?: number;
}): FutureSelfNote {
  const now = nowIso();
  return {
    id: createUuid(),
    userId: input.userId,
    title: input.title,
    body: input.body,
    targetYear: input.targetYear,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
}

export function createLifeBookEntry(input: {
  userId: EntityId;
  title: string;
  body: string;
  chapter?: string;
  mood?: string;
  linkedMemoryId?: EntityId;
}): LifeBookEntry {
  return {
    id: createUuid(),
    userId: input.userId,
    title: input.title,
    body: input.body,
    chapter: input.chapter,
    mood: input.mood,
    linkedMemoryId: input.linkedMemoryId,
    savedAt: nowIso(),
  };
}

export function createLifeChallenge(input: {
  userId: EntityId;
  title: string;
  description?: string;
  durationDays?: number;
}): LifeChallenge {
  const now = nowIso();
  return {
    id: createUuid(),
    userId: input.userId,
    title: input.title,
    description: input.description,
    durationDays: input.durationDays ?? 7,
    progressDays: 0,
    status: 'active',
    startedAt: now,
    updatedAt: now,
  };
}
