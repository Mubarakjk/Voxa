import { STORAGE_KEYS } from '../../constants/storage-keys';
import { IStorageService } from '../contracts';

export type UsageEventInput = {
  userId: string;
  eventRefId: string;
  metric: string;
  amount?: number;
  model?: string;
  metadata?: Record<string, unknown>;
};

/** Client-side usage event queue — server tables enforce authoritative limits. */
export class UsageProtectionService {
  constructor(private readonly storage: IStorageService) {}

  private queueKey(userId: string) {
    return `${STORAGE_KEYS.subscriptionAnalytics}:usage_queue:${userId}`;
  }

  async recordEvent(input: UsageEventInput): Promise<void> {
    const queue = (await this.storage.getItem<UsageEventInput[]>(this.queueKey(input.userId))) ?? [];
    const exists = queue.some((item) => item.eventRefId === input.eventRefId);
    if (exists) return;
    queue.push({ ...input, amount: input.amount ?? 1 });
    await this.storage.setItem(this.queueKey(input.userId), queue.slice(-200));
  }

  async getQueuedEvents(userId: string): Promise<UsageEventInput[]> {
    return (await this.storage.getItem<UsageEventInput[]>(this.queueKey(userId))) ?? [];
  }

  async clearQueuedEvents(userId: string): Promise<void> {
    await this.storage.removeItem(this.queueKey(userId));
  }
}

export const ABUSE_LIMITS = {
  maxMessageChars: 8000,
  maxAudioSeconds: 180,
  maxImageBytes: 12 * 1024 * 1024,
  maxRetryCount: 3,
} as const;
