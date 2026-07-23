import { createUuid, EntityId, nowIso } from '../../types';
import { Goal, Memory } from '../../types';
import { RelationshipMilestone } from '../../types/phase12-experiences';
import { CompanionIntelligenceBundle } from '../../types/companion-intelligence';
import { PhotoMemory } from '../../types/phase12-experiences';
import { STORAGE_KEYS } from '../../constants/storage-keys';
import { IStorageService } from '../contracts';

export function buildVerifiedMilestones(input: {
  userId: EntityId;
  bundle: CompanionIntelligenceBundle;
  memories: Memory[];
  goals: Goal[];
  photos: PhotoMemory[];
  conversationCount: number;
  messageCount?: number;
  firstCoachingAt?: string | null;
  firstChallengeAt?: string | null;
  ritualStreak?: number;
}): RelationshipMilestone[] {
  const rel = input.bundle.relationship;
  const ms: RelationshipMilestone[] = [];
  const push = (m: Omit<RelationshipMilestone, 'id' | 'userId' | 'favourite' | 'hidden' | 'userCreated'>) => {
    ms.push({ ...m, id: `ms-${m.title.replace(/\s+/g, '-').toLowerCase()}`, userId: input.userId, favourite: false, hidden: false, userCreated: false });
  };

  push({
    title: 'First conversation',
    description: 'Where it all started.',
    occurredAt: rel.relationshipStartedAt,
    source: 'conversation',
    confidence: 'verified',
  });

  const firstMem = input.memories[0];
  if (firstMem) {
    push({
      title: 'First saved memory',
      description: `"${firstMem.title}"`,
      occurredAt: firstMem.createdAt,
      source: 'memory',
      confidence: 'verified',
      linkedMemoryId: firstMem.id,
    });
  }

  const firstVoice = input.memories.find((m) => m.tags?.includes('voice-memory'));
  if (firstVoice) {
    push({
      title: 'First voice note',
      description: 'Your voice became part of our story.',
      occurredAt: firstVoice.createdAt,
      source: 'memory',
      confidence: 'verified',
      linkedMemoryId: firstVoice.id,
    });
  }

  const firstPhoto = input.photos[0];
  if (firstPhoto) {
    push({
      title: 'First photo memory',
      description: `"${firstPhoto.title}"`,
      occurredAt: firstPhoto.createdAt,
      source: 'photo',
      confidence: 'verified',
      linkedPhotoId: firstPhoto.id,
    });
  }

  const firstGoal = input.goals.find((g) => g.status === 'completed');
  if (firstGoal) {
    push({
      title: 'First goal completed',
      description: `"${firstGoal.title}"`,
      occurredAt: firstGoal.updatedAt ?? firstGoal.createdAt,
      source: 'system',
      confidence: 'verified',
    });
  }

  if (input.conversationCount >= 100) {
    push({
      title: '100 conversations',
      description: 'A hundred chats together.',
      occurredAt: rel.updatedAt,
      source: 'conversation',
      confidence: 'verified',
    });
  }

  if (input.messageCount && input.messageCount >= 1000) {
    push({
      title: '1,000 messages',
      description: 'A lot of words — and meaning — shared.',
      occurredAt: rel.updatedAt,
      source: 'conversation',
      confidence: 'verified',
    });
  }

  const days = Math.floor((Date.now() - new Date(rel.relationshipStartedAt).getTime()) / 86400000);
  if (days >= 30) {
    push({ title: 'One month together', description: '30 days of showing up.', occurredAt: rel.updatedAt, source: 'system', confidence: 'verified' });
  }
  if (days >= 180) {
    push({ title: 'Six months together', description: 'Half a year of your story.', occurredAt: rel.updatedAt, source: 'system', confidence: 'verified' });
  }
  if (days >= 365) {
    push({ title: 'One year together', description: 'A full year.', occurredAt: rel.updatedAt, source: 'system', confidence: 'verified' });
  }

  if (input.firstCoachingAt) {
    push({ title: 'First coaching session', description: 'You asked for structured support.', occurredAt: input.firstCoachingAt, source: 'coaching', confidence: 'verified' });
  }

  if (input.firstChallengeAt) {
    push({ title: 'First challenge completed', description: 'You showed up for yourself.', occurredAt: input.firstChallengeAt, source: 'challenge', confidence: 'verified' });
  }

  if ((input.ritualStreak ?? 0) >= 7) {
    push({ title: 'First ritual streak', description: `${input.ritualStreak} days of check-ins.`, occurredAt: nowIso(), source: 'ritual', confidence: 'verified' });
  }

  const joke = input.bundle.insideJokes[0];
  if (joke) {
    push({ title: 'First inside joke', description: `"${joke.label}"`, occurredAt: joke.lastReferencedAt ?? joke.createdAt, source: 'system', confidence: 'inferred' });
  }

  return ms.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}

export class RelationshipTimelineService {
  constructor(private readonly storage: IStorageService) {}

  async list(userId: EntityId): Promise<RelationshipMilestone[]> {
    const map = (await this.storage.getItem<Record<string, RelationshipMilestone[]>>(STORAGE_KEYS.relationshipMilestones)) ?? {};
    return (map[userId] ?? []).filter((m) => !m.hidden).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }

  async sync(userId: EntityId, verified: RelationshipMilestone[]): Promise<RelationshipMilestone[]> {
    const map = (await this.storage.getItem<Record<string, RelationshipMilestone[]>>(STORAGE_KEYS.relationshipMilestones)) ?? {};
    const existing = map[userId] ?? [];
    const userCreated = existing.filter((m) => m.userCreated);
    const merged = [...verified];
    for (const e of existing) {
      if (!merged.some((m) => m.id === e.id)) merged.push(e);
    }
    map[userId] = [...merged, ...userCreated.filter((u) => !merged.some((m) => m.id === u.id))].slice(0, 100);
    await this.storage.setItem(STORAGE_KEYS.relationshipMilestones, map);
    return map[userId]!.filter((m) => !m.hidden);
  }

  async addManual(userId: EntityId, title: string, description: string, date: string): Promise<RelationshipMilestone> {
    const m: RelationshipMilestone = {
      id: createUuid(),
      userId,
      title,
      description,
      occurredAt: date,
      source: 'user',
      confidence: 'verified',
      favourite: false,
      hidden: false,
      userCreated: true,
    };
    const map = (await this.storage.getItem<Record<string, RelationshipMilestone[]>>(STORAGE_KEYS.relationshipMilestones)) ?? {};
    map[userId] = [m, ...(map[userId] ?? [])];
    await this.storage.setItem(STORAGE_KEYS.relationshipMilestones, map);
    return m;
  }

  async toggleFavourite(userId: EntityId, id: EntityId): Promise<void> {
    const map = (await this.storage.getItem<Record<string, RelationshipMilestone[]>>(STORAGE_KEYS.relationshipMilestones)) ?? {};
    map[userId] = (map[userId] ?? []).map((m) => (m.id === id ? { ...m, favourite: !m.favourite } : m));
    await this.storage.setItem(STORAGE_KEYS.relationshipMilestones, map);
  }

  async hide(userId: EntityId, id: EntityId): Promise<void> {
    const map = (await this.storage.getItem<Record<string, RelationshipMilestone[]>>(STORAGE_KEYS.relationshipMilestones)) ?? {};
    map[userId] = (map[userId] ?? []).map((m) => (m.id === id ? { ...m, hidden: true } : m));
    await this.storage.setItem(STORAGE_KEYS.relationshipMilestones, map);
  }
}

let instance: RelationshipTimelineService | null = null;

export function getRelationshipTimelineService(storage: IStorageService) {
  if (!instance) instance = new RelationshipTimelineService(storage);
  return instance;
}
