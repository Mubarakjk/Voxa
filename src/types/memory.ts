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
  | 'emotional';

export type MemoryMood =
  | 'motivated'
  | 'warm'
  | 'joyful'
  | 'calm'
  | 'reflective'
  | 'stressed'
  | 'neutral';

export type MemorySource = 'conversation' | 'voice_call' | 'manual' | 'check_in';

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
};

export type UpdateMemoryInput = Partial<
  Pick<Memory, 'category' | 'title' | 'content' | 'mood' | 'importance' | 'tags' | 'relatedMode' | 'occurredAt'>
>;
