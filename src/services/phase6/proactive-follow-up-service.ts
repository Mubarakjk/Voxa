import { STORAGE_KEYS } from '../../constants/storage-keys';
import { createUuid, EntityId, nowIso } from '../../types';
import { FollowUpStatus, ProactiveFollowUp } from '../../types/phase6-premium';
import { IStorageService } from '../contracts';

const TOPIC_PATTERNS: Array<{ regex: RegExp; topic: string; prompt: (m: string) => string }> = [
  { regex: /\binterview\b/i, topic: 'interview', prompt: () => 'You said the interview was coming up. How did it go?' },
  { regex: /\bapplication\b|\bapplied\b/i, topic: 'application', prompt: () => 'You mentioned an application. Any news yet?' },
  { regex: /\bexam\b|\btest\b/i, topic: 'exam', prompt: () => 'How did the exam go?' },
  { regex: /\bworkout\b|\bgym\b|\brun\b/i, topic: 'workout', prompt: () => 'You planned a workout. Did you get to it?' },
  { regex: /\btravel\b|\btrip\b/i, topic: 'travel', prompt: () => 'You were planning a trip. How is that going?' },
  { regex: /\bdecide\b|\bdecision\b|\bshould i\b/i, topic: 'decision', prompt: () => 'You were weighing a decision. Have you had more clarity?' },
  { regex: /\bfinish\b|\bcomplete\b.*\b(login|project|task)\b/i, topic: 'task', prompt: (m) => `You mentioned "${m.slice(0, 40)}…" — did you manage it?` },
];

export class ProactiveFollowUpService {
  constructor(private readonly storage: IStorageService) {}

  async list(userId: EntityId): Promise<ProactiveFollowUp[]> {
    const map = (await this.storage.getItem<Record<string, ProactiveFollowUp[]>>(STORAGE_KEYS.proactiveFollowUps)) ?? {};
    return (map[userId] ?? []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async detectFromMessage(userId: EntityId, message: string): Promise<ProactiveFollowUp | null> {
    const existing = await this.list(userId);
    const open = existing.filter((f) => f.status === 'open');
    if (open.length >= 5) return null;

    for (const pattern of TOPIC_PATTERNS) {
      if (!pattern.regex.test(message)) continue;
      const duplicate = open.find((f) => f.topic === pattern.topic);
      if (duplicate) return null;
      const followUp: ProactiveFollowUp = {
        id: createUuid(),
        userId,
        topic: pattern.topic,
        prompt: pattern.prompt(message),
        sourceMessage: message.slice(0, 200),
        status: 'open',
        createdAt: nowIso(),
      };
      await this.upsert(followUp);
      return followUp;
    }
    return null;
  }

  async getTodaysFollowUp(userId: EntityId, opts?: { proactiveEnabled?: boolean; quietHours?: boolean }): Promise<ProactiveFollowUp | null> {
    if (opts?.proactiveEnabled === false || opts?.quietHours) return null;
    const items = await this.list(userId);
    const today = new Date().toISOString().slice(0, 10);
    const shownToday = items.some((f) => f.status === 'resolved' && f.resolvedAt?.startsWith(today));
    if (shownToday) return null;
    const candidate = items.find((f) => f.status === 'open' && !f.scheduledFor);
    if (!candidate) return null;
    const daysSince = (Date.now() - new Date(candidate.createdAt).getTime()) / 86400000;
    if (daysSince < 1) return null;
    return candidate;
  }

  async resolve(id: EntityId, userId: EntityId, status: FollowUpStatus = 'resolved'): Promise<void> {
    const items = await this.list(userId);
    const next = items.map((f) =>
      f.id === id ? { ...f, status, resolvedAt: nowIso() } : f,
    );
    await this.save(userId, next);
  }

  async dismiss(id: EntityId, userId: EntityId): Promise<void> {
    await this.resolve(id, userId, 'dismissed');
  }

  private async upsert(item: ProactiveFollowUp): Promise<void> {
    const items = await this.list(item.userId);
    await this.save(item.userId, [item, ...items]);
  }

  private async save(userId: EntityId, items: ProactiveFollowUp[]): Promise<void> {
    const map = (await this.storage.getItem<Record<string, ProactiveFollowUp[]>>(STORAGE_KEYS.proactiveFollowUps)) ?? {};
    map[userId] = items.slice(0, 30);
    await this.storage.setItem(STORAGE_KEYS.proactiveFollowUps, map);
  }
}

let instance: ProactiveFollowUpService | null = null;

export function getProactiveFollowUpService(storage: IStorageService): ProactiveFollowUpService {
  if (!instance) instance = new ProactiveFollowUpService(storage);
  return instance;
}
