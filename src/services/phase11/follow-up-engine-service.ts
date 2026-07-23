import { STORAGE_KEYS } from '../../constants/storage-keys';
import { createUuid, EntityId, nowIso } from '../../types';
import { FollowUpStatus, ProactiveFollowUp } from '../../types/phase6-premium';
import { LivingFollowUp } from '../../types/phase11-living-companion';
import { IStorageService } from '../contracts';
import { getFutureConversationsService } from '../phase8/future-conversations-service';

type TopicRule = {
  regex: RegExp;
  topic: string;
  prompt: (msg: string) => string;
  delayDays: number;
};

const TOPIC_RULES: TopicRule[] = [
  { regex: /\binterview\b/i, topic: 'interview', prompt: () => 'How did that interview go?', delayDays: 2 },
  { regex: /\bexam\b|\btest\b/i, topic: 'exam', prompt: () => 'How did the exam go?', delayDays: 2 },
  { regex: /\bgym\b|\bworkout\b/i, topic: 'gym', prompt: () => "How's the gym going?", delayDays: 7 },
  { regex: /\bstartup\b|\bbusiness\b/i, topic: 'business', prompt: () => 'How is the business coming along?', delayDays: 3 },
  { regex: /\brelationship\b|\bgirlfriend\b|\bboyfriend\b|\bpartner\b/i, topic: 'relationship', prompt: () => 'How are things on the relationship front?', delayDays: 5 },
  { regex: /\bholiday\b|\btrip\b|\btravel\b/i, topic: 'holiday', prompt: () => 'How was the trip?', delayDays: 3 },
  { regex: /\bfootball\b|\bmatch\b|\bgame day\b/i, topic: 'football', prompt: () => 'Did the match go well?', delayDays: 2 },
  { regex: /\bfamily\b|\bmum\b|\bdad\b/i, topic: 'family', prompt: () => 'How is your family doing?', delayDays: 4 },
  { regex: /\bhealth\b|\bdoctor\b|\bhospital\b/i, topic: 'health', prompt: () => 'How are you feeling — any update on your health?', delayDays: 3 },
  { regex: /\bmoney\b|\bfinance\b|\bbill\b|\bdebt\b/i, topic: 'money', prompt: () => 'How is the money situation — any clearer?', delayDays: 5 },
];

function scheduleDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export class FollowUpEngineService {
  constructor(private readonly storage: IStorageService) {}

  async list(userId: EntityId): Promise<ProactiveFollowUp[]> {
    const map = (await this.storage.getItem<Record<string, ProactiveFollowUp[]>>(STORAGE_KEYS.proactiveFollowUps)) ?? {};
    return map[userId] ?? [];
  }

  async detectFromMessage(userId: EntityId, message: string): Promise<ProactiveFollowUp | null> {
    const items = await this.list(userId);
    const open = items.filter((f) => f.status === 'open');
    if (open.length >= 8) return null;

    for (const rule of TOPIC_RULES) {
      if (!rule.regex.test(message)) continue;
      if (open.some((f) => f.topic === rule.topic)) return null;

      const followUp: ProactiveFollowUp = {
        id: createUuid(),
        userId,
        topic: rule.topic,
        prompt: rule.prompt(message),
        sourceMessage: message.slice(0, 200),
        scheduledFor: scheduleDate(rule.delayDays),
        status: 'open',
        createdAt: nowIso(),
      };
      const map = (await this.storage.getItem<Record<string, ProactiveFollowUp[]>>(STORAGE_KEYS.proactiveFollowUps)) ?? {};
      map[userId] = [followUp, ...items].slice(0, 30);
      await this.storage.setItem(STORAGE_KEYS.proactiveFollowUps, map);
      return followUp;
    }
    return null;
  }

  async getDueFollowUp(userId: EntityId): Promise<LivingFollowUp | null> {
    const now = Date.now();
    const items = await this.list(userId);
    const due = items
      .filter((f) => f.status === 'open' && f.scheduledFor && new Date(f.scheduledFor).getTime() <= now)
      .sort((a, b) => (a.scheduledFor ?? '').localeCompare(b.scheduledFor ?? ''));

    if (due[0]) {
      return {
        id: due[0].id,
        prompt: due[0].prompt,
        topic: due[0].topic,
        dueLabel: 'Follow-up',
      };
    }

    const future = await getFutureConversationsService(this.storage).getDueToday(userId);
    if (future?.resumeLine) {
      return {
        id: future.id,
        prompt: future.resumeLine,
        topic: 'future',
        dueLabel: 'Picking up',
      };
    }

    const fallback = items.find((f) => f.status === 'open' && !f.scheduledFor);
    if (fallback) {
      const daysSince = (now - new Date(fallback.createdAt).getTime()) / 86400000;
      if (daysSince >= 1) {
        return {
          id: fallback.id,
          prompt: fallback.prompt,
          topic: fallback.topic,
          dueLabel: 'Checking in',
        };
      }
    }

    return null;
  }

  async resolve(id: EntityId, userId: EntityId, status: FollowUpStatus = 'resolved'): Promise<void> {
    const items = await this.list(userId);
    const map = (await this.storage.getItem<Record<string, ProactiveFollowUp[]>>(STORAGE_KEYS.proactiveFollowUps)) ?? {};
    map[userId] = items.map((f) =>
      f.id === id ? { ...f, status, resolvedAt: nowIso() } : f,
    );
    await this.storage.setItem(STORAGE_KEYS.proactiveFollowUps, map);
  }
}

let instance: FollowUpEngineService | null = null;

export function getFollowUpEngineService(storage: IStorageService) {
  if (!instance) instance = new FollowUpEngineService(storage);
  return instance;
}
