import { EntityId } from '../../types';
import { VoxaRepositories } from '../contracts';

export type InactivitySnapshot = {
  lastActivityAt: Date | null;
  hoursSinceActivity: number | null;
};

export class InactivityTracker {
  constructor(private readonly repositories: VoxaRepositories) {}

  async getLastActivityAt(userId: EntityId, storedActivityAt?: string): Promise<Date | null> {
    const conversations = await this.repositories.conversations.listConversations(userId);
    const latestConversationAt = conversations[0]?.lastMessageAt ?? conversations[0]?.updatedAt;
    const candidates = [storedActivityAt, latestConversationAt].filter(Boolean) as string[];
    if (!candidates.length) return null;
    const latest = candidates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
    return new Date(latest);
  }

  async snapshot(userId: EntityId, storedActivityAt?: string, now = new Date()): Promise<InactivitySnapshot> {
    const lastActivityAt = await this.getLastActivityAt(userId, storedActivityAt);
    if (!lastActivityAt) {
      return { lastActivityAt: null, hoursSinceActivity: null };
    }
    const hoursSinceActivity = (now.getTime() - lastActivityAt.getTime()) / (1000 * 60 * 60);
    return { lastActivityAt, hoursSinceActivity };
  }
}
