import { STORAGE_KEYS } from '../../constants/storage-keys';
import { createUuid, EntityId, nowIso } from '../../types';
import { CoachId, CoachingProfile, CoachingSession } from '../../types/phase12-experiences';
import { IStorageService } from '../contracts';

export type CoachDefinition = {
  id: CoachId;
  name: string;
  purpose: string;
  tone: string;
  boundaries: string;
  starters: string[];
};

export const COACH_DEFINITIONS: CoachDefinition[] = [
  { id: 'startup', name: 'Startup Coach', purpose: 'Build and ship your idea', tone: 'Direct, energising', boundaries: 'Not legal or investment advice', starters: ['Review my startup idea', 'Help me prioritise this week'] },
  { id: 'coding', name: 'Software Coach', purpose: 'Learn and debug code', tone: 'Patient, precise', boundaries: 'Not a replacement for code review in production', starters: ['Explain this concept', 'Help me debug my approach'] },
  { id: 'study', name: 'Study Coach', purpose: 'Exam prep and learning plans', tone: 'Structured, encouraging', boundaries: 'Not academic dishonesty', starters: ['Build a study plan', 'Quiz me on this topic'] },
  { id: 'interview', name: 'Interview Coach', purpose: 'Practice and confidence', tone: 'Supportive, realistic', boundaries: 'Not guaranteed outcomes', starters: ['Mock interview question', 'Review my answer'] },
  { id: 'fitness', name: 'Fitness Accountability', purpose: 'Show up consistently', tone: 'Motivating, honest', boundaries: 'Not medical or physiotherapy advice', starters: ['Check in on my workout', 'Help me stay consistent'] },
  { id: 'confidence', name: 'Confidence Coach', purpose: 'Self-belief and action', tone: 'Warm, challenging', boundaries: 'Not therapy', starters: ['I doubt myself about…', 'Help me take one brave step'] },
  { id: 'career', name: 'Career Coach', purpose: 'Direction and decisions', tone: 'Thoughtful, practical', boundaries: 'Not HR or legal advice', starters: ['Career crossroads', 'Review my CV story'] },
  { id: 'productivity', name: 'Productivity Coach', purpose: 'Focus and systems', tone: 'Clear, no fluff', boundaries: 'Not burnout treatment', starters: ['Plan my day', 'Where am I leaking time?'] },
  { id: 'relationship', name: 'Relationship Reflection', purpose: 'Reflect on relationships', tone: 'Gentle, curious', boundaries: 'Not couples therapy', starters: ['Help me reflect on…', 'What might I be missing?'] },
  { id: 'financial', name: 'Financial Habits Coach', purpose: 'Spending and saving habits', tone: 'Non-judgemental', boundaries: 'Not licensed financial advice', starters: ['Review my spending habits', 'Build a savings habit'] },
];

export class CoachingService {
  constructor(private readonly storage: IStorageService) {}

  async listProfiles(userId: EntityId): Promise<CoachingProfile[]> {
    const map = (await this.storage.getItem<Record<string, CoachingProfile[]>>(STORAGE_KEYS.coachingProfiles)) ?? {};
    return map[userId] ?? [];
  }

  async getActive(userId: EntityId): Promise<CoachingProfile | null> {
    return (await this.listProfiles(userId)).find((p) => p.status === 'active') ?? null;
  }

  async start(userId: EntityId, coachId: CoachId, focus: string): Promise<CoachingProfile> {
    const def = COACH_DEFINITIONS.find((c) => c.id === coachId)!;
    const profile: CoachingProfile = {
      coachId,
      userId,
      status: 'active',
      currentFocus: focus || def.purpose,
      activePlan: def.starters.slice(0, 2),
      startedAt: nowIso(),
      updatedAt: nowIso(),
    };
    const map = (await this.storage.getItem<Record<string, CoachingProfile[]>>(STORAGE_KEYS.coachingProfiles)) ?? {};
    const items = (map[userId] ?? []).filter((p) => p.coachId !== coachId);
    map[userId] = [profile, ...items];
    await this.storage.setItem(STORAGE_KEYS.coachingProfiles, map);
    return profile;
  }

  async pause(userId: EntityId, coachId: CoachId): Promise<void> {
    await this.setStatus(userId, coachId, 'paused');
  }

  async end(userId: EntityId, coachId: CoachId): Promise<void> {
    await this.setStatus(userId, coachId, 'ended');
  }

  async recordSession(userId: EntityId, coachId: CoachId, summary: string, actionSteps: string[]): Promise<CoachingSession> {
    const session: CoachingSession = {
      id: createUuid(),
      coachId,
      userId,
      summary,
      actionSteps,
      startedAt: nowIso(),
      endedAt: nowIso(),
    };
    const map = (await this.storage.getItem<Record<string, CoachingSession[]>>(STORAGE_KEYS.coachingSessions)) ?? {};
    map[userId] = [session, ...(map[userId] ?? [])].slice(0, 50);
    await this.storage.setItem(STORAGE_KEYS.coachingSessions, map);
    return session;
  }

  async sessions(userId: EntityId, coachId?: CoachId): Promise<CoachingSession[]> {
    const map = (await this.storage.getItem<Record<string, CoachingSession[]>>(STORAGE_KEYS.coachingSessions)) ?? {};
    let items = map[userId] ?? [];
    if (coachId) items = items.filter((s) => s.coachId === coachId);
    return items;
  }

  promptBlock(coachId: CoachId): string {
    const def = COACH_DEFINITIONS.find((c) => c.id === coachId);
    if (!def) return '';
    return `Coaching mode: ${def.name}. Purpose: ${def.purpose}. Tone: ${def.tone}. Boundaries: ${def.boundaries}. Voxa is not a licensed professional.`;
  }

  private async setStatus(userId: EntityId, coachId: CoachId, status: CoachingProfile['status']): Promise<void> {
    const map = (await this.storage.getItem<Record<string, CoachingProfile[]>>(STORAGE_KEYS.coachingProfiles)) ?? {};
    map[userId] = (map[userId] ?? []).map((p) =>
      p.coachId === coachId ? { ...p, status, updatedAt: nowIso() } : p,
    );
    await this.storage.setItem(STORAGE_KEYS.coachingProfiles, map);
  }
}

let instance: CoachingService | null = null;

export function getCoachingService(storage: IStorageService) {
  if (!instance) instance = new CoachingService(storage);
  return instance;
}
