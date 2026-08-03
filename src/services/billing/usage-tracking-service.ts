import { STORAGE_KEYS } from '../../constants/storage-keys';
import { IStorageService } from '../contracts';
import { UsageBucket, UsageMetric } from '../../types/subscription';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

function emptyMetrics(): Record<UsageMetric, number> {
  return {
    aiMessages: 0,
    voiceMinutes: 0,
    imageUploads: 0,
    videoUploads: 0,
    voiceNotes: 0,
    documents: 0,
    storageBytes: 0,
  };
}

export function createEmptyUsageBucket(): UsageBucket {
  return {
    daily: emptyMetrics(),
    monthly: emptyMetrics(),
    dailyKey: todayKey(),
    monthlyKey: monthKey(),
    memoryCount: 0,
    goalCount: 0,
    reminderCount: 0,
  };
}

function rolloverIfNeeded(usage: UsageBucket): UsageBucket {
  const today = todayKey();
  const month = monthKey();
  const next = { ...usage, daily: { ...usage.daily }, monthly: { ...usage.monthly } };

  if (next.dailyKey !== today) {
    next.daily = emptyMetrics();
    next.dailyKey = today;
  }
  if (next.monthlyKey !== month) {
    next.monthly = emptyMetrics();
    next.monthlyKey = month;
  }
  return next;
}

export class UsageTrackingService {
  constructor(private readonly storage: IStorageService) {}

  private usageKey(userId: string) {
    return `${STORAGE_KEYS.usageTracking}:${userId}`;
  }

  async getUsage(userId: string): Promise<UsageBucket> {
    const stored = await this.storage.getItem<UsageBucket>(this.usageKey(userId));
    return rolloverIfNeeded(stored ?? createEmptyUsageBucket());
  }

  async saveUsage(userId: string, usage: UsageBucket): Promise<UsageBucket> {
    const normalized = rolloverIfNeeded(usage);
    await this.storage.setItem(this.usageKey(userId), normalized);
    return normalized;
  }

  async record(userId: string, metric: UsageMetric, amount = 1): Promise<UsageBucket> {
    const usage = await this.getUsage(userId);
    const delta = Math.max(0, amount);
    usage.daily[metric] = Math.max(0, usage.daily[metric] + delta);
    usage.monthly[metric] = Math.max(0, usage.monthly[metric] + delta);
    return this.saveUsage(userId, usage);
  }

  async recordAiMessage(userId: string): Promise<UsageBucket> {
    return this.record(userId, 'aiMessages');
  }

  async recordVoiceMinute(userId: string, minutes: number): Promise<UsageBucket> {
    return this.record(userId, 'voiceMinutes', minutes);
  }

  async recordImageUpload(userId: string): Promise<UsageBucket> {
    return this.record(userId, 'imageUploads');
  }

  async recordVideoUpload(userId: string): Promise<UsageBucket> {
    return this.record(userId, 'videoUploads');
  }

  async recordVoiceNote(userId: string): Promise<UsageBucket> {
    return this.record(userId, 'voiceNotes');
  }

  async recordDocument(userId: string): Promise<UsageBucket> {
    return this.record(userId, 'documents');
  }

  async recordStorageBytes(userId: string, bytes: number): Promise<UsageBucket> {
    return this.record(userId, 'storageBytes', bytes);
  }

  async syncCounts(userId: string, counts: { memories: number; goals: number; reminders: number }) {
    const usage = await this.getUsage(userId);
    usage.memoryCount = counts.memories;
    usage.goalCount = counts.goals;
    usage.reminderCount = counts.reminders;
    return this.saveUsage(userId, usage);
  }

  async clearUsage(userId: string) {
    await this.storage.removeItem(this.usageKey(userId));
  }
}
