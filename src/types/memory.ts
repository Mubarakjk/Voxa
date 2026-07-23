import { CompanionModeId } from './companion-mode';
import { EntityId, ISODateString, Timestamps } from './common';

export type MemoryCategory =
  | 'preferences'
  | 'people'
  | 'goals'
  | 'moments'
  | 'study'
  | 'productivity'
  | 'fitness'
  | 'business'
  | 'emotional'
  | 'routines'
  | 'favourites'
  | 'work'
  | 'faith'
  | 'habits'
  | 'fears'
  | 'birthdays'
  | 'future_plans';

export type MemoryMood =
  | 'motivated'
  | 'warm'
  | 'joyful'
  | 'calm'
  | 'reflective'
  | 'stressed'
  | 'neutral';

export type MemorySource = 'conversation' | 'voice_call' | 'manual' | 'check_in' | 'image' | 'audio' | 'video' | 'text';

/**
 * Long-term knowledge Voxa retains about the user's life, preferences, and important moments.
 */
export type Memory = Timestamps & {
  id: EntityId;
  userId: EntityId;
  category: MemoryCategory;
  title: string;
  content: string;
  mood: MemoryMood;
  importance: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  source: MemorySource;
  relatedMode?: CompanionModeId;
  occurredAt?: ISODateString;
  /** When this memory was last injected into an AI prompt. */
  lastUsedAt?: ISODateString;
  /** How often this memory has been retrieved for prompts. */
  useCount: number;
  /** 1–5 emotional weight for retrieval and retention. */
  emotionalSignificance?: 1 | 2 | 3 | 4 | 5;
  /** 0–1 confidence that this memory is accurate and still valid. */
  confidence?: number;
  /** Optional expiry for transient facts (e.g. temporary projects). */
  expiresAt?: ISODateString;
  /** User-pinned memories surface first in retrieval and Journey. */
  pinned?: boolean;
};

export type CreateMemoryInput = {
  userId: EntityId;
  category: MemoryCategory;
  title: string;
  content: string;
  mood?: MemoryMood;
  importance?: Memory['importance'];
  tags?: string[];
  source?: MemorySource;
  relatedMode?: CompanionModeId;
  occurredAt?: ISODateString;
  lastUsedAt?: ISODateString;
  useCount?: number;
  emotionalSignificance?: Memory['emotionalSignificance'];
  confidence?: number;
  expiresAt?: ISODateString;
  pinned?: boolean;
};

export type UpdateMemoryInput = Partial<
  Pick<
    Memory,
    | 'category'
    | 'title'
    | 'content'
    | 'mood'
    | 'importance'
    | 'tags'
    | 'relatedMode'
    | 'occurredAt'
    | 'lastUsedAt'
    | 'useCount'
    | 'emotionalSignificance'
    | 'confidence'
    | 'expiresAt'
    | 'pinned'
  >
>;
