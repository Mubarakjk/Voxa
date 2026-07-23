import { EntityId, UserProfile, nowIso } from '../../types';
import {
  ProactiveCheckInSettings,
  ProactiveInactivityHours,
  createDefaultProactiveCheckInSettings,
} from '../../types/proactive-check-in';
import { VoxaRepositories, IStorageService } from '../contracts';
import { RoutineCoachService } from '../routine/routine-coach-service';
import { InactivityTracker } from './inactivity-tracker';
import {
  ProactiveCheckInMessageBuilder,
  loadRoutineContext,
  proactiveCheckInMessageBuilder,
} from './proactive-check-in-message-builder';
import { ProactiveCheckInScheduler, proactiveCheckInScheduler } from './proactive-check-in-scheduler';
import { ProactiveCheckInStore } from './proactive-check-in-store';

export type ProactiveCheckInSyncResult = {
  scheduled: boolean;
  delivered: boolean;
  message?: string;
  scheduledAt?: string;
};

export class ProactiveCheckInOrchestrator {
  private readonly store: ProactiveCheckInStore;
  private readonly inactivity: InactivityTracker;
  private readonly routineService: RoutineCoachService;

  constructor(
    storage: IStorageService,
    private readonly repositories: VoxaRepositories,
    private readonly messageBuilder: ProactiveCheckInMessageBuilder = proactiveCheckInMessageBuilder,
    private readonly scheduler: ProactiveCheckInScheduler = proactiveCheckInScheduler,
  ) {
    this.store = new ProactiveCheckInStore(storage);
    this.inactivity = new InactivityTracker(repositories);
    this.routineService = new RoutineCoachService(storage, repositories);
  }

  async getSettings(userId: EntityId): Promise<ProactiveCheckInSettings> {
    const state = await this.store.getState(userId);
    return state.settings;
  }

  async updateSettings(userId: EntityId, patch: Partial<ProactiveCheckInSettings>): Promise<ProactiveCheckInSettings> {
    const settings = await this.store.updateSettings(userId, patch);
    const profile = await this.repositories.userProfile.getProfile();
    if (profile) await this.sync(userId, profile);
    return settings;
  }

  async recordActivity(userId: EntityId): Promise<void> {
    const at = nowIso();
    const settings = await this.store.updateSettings(userId, {
      lastActivityAt: at,
      lastDeliveredAt: undefined,
    });
    await this.scheduler.cancelPending(settings.pendingNotificationId);
    await this.store.updateSettings(userId, { pendingNotificationId: undefined });

    const profile = await this.repositories.userProfile.getProfile();
    if (profile) await this.sync(userId, profile);
  }

  private isEnabled(profile: UserProfile, settings: ProactiveCheckInSettings): boolean {
    if (!settings.enabled) return false;
    if (profile.preferences.checkInStyle === 'off') return false;
    if (profile.onboarding?.notificationPreference === 'off') return false;
    return true;
  }

  private shouldDeliver(
    settings: ProactiveCheckInSettings,
    hoursSinceActivity: number,
    threshold: ProactiveInactivityHours,
  ): boolean {
    if (hoursSinceActivity < threshold) return false;
    if (!settings.lastDeliveredAt) return true;
    if (!settings.lastActivityAt) return true;
    return new Date(settings.lastDeliveredAt).getTime() < new Date(settings.lastActivityAt).getTime();
  }

  async sync(userId: EntityId, profile: UserProfile, now = new Date()): Promise<ProactiveCheckInSyncResult> {
    const state = await this.store.getState(userId);
    const settings = state.settings.enabled ? state.settings : createDefaultProactiveCheckInSettings();
    if (!this.isEnabled(profile, settings)) {
      await this.scheduler.cancelPending(settings.pendingNotificationId);
      await this.store.updateSettings(userId, { pendingNotificationId: undefined });
      return { scheduled: false, delivered: false };
    }

    const activity = await this.inactivity.snapshot(userId, settings.lastActivityAt, now);
    if (!activity.lastActivityAt || activity.hoursSinceActivity === null) {
      return { scheduled: false, delivered: false };
    }

    if (!settings.lastActivityAt) {
      await this.store.updateSettings(userId, { lastActivityAt: activity.lastActivityAt.toISOString() });
    }

    const threshold = settings.inactivityHours;
    const dueAt = new Date(activity.lastActivityAt.getTime() + threshold * 60 * 60 * 1000);

    if (!this.shouldDeliver(settings, activity.hoursSinceActivity, threshold)) {
      await this.scheduler.cancelPending(settings.pendingNotificationId);
      await this.store.updateSettings(userId, { pendingNotificationId: undefined });
      return { scheduled: false, delivered: false };
    }

    const [goals, memories, routineContext] = await Promise.all([
      this.repositories.goals.listActiveGoals(userId),
      this.repositories.memories.listMemories(userId),
      loadRoutineContext(this.routineService, userId, now),
    ]);

    const candidate = this.messageBuilder.build({
      profile,
      goals,
      memories,
      routineBlocks: routineContext.blocks,
      missedRoutine: routineContext.missedRoutine,
      hoursSinceLastMessage: activity.hoursSinceActivity,
      usedMessages: await this.store.getUsedMessages(userId),
      now,
    });

    if (now.getTime() >= dueAt.getTime()) {
      const notificationId = await this.scheduler.deliverNow({
        userId,
        profile,
        scheduledAt: now,
        message: candidate.message,
        templateId: candidate.id,
      });
      await this.store.recordDelivery(userId, {
        message: candidate.message,
        templateId: candidate.id,
        templateKind: candidate.kind,
      });
      await this.store.updateSettings(userId, { pendingNotificationId: notificationId ?? undefined });
      return { scheduled: false, delivered: true, message: candidate.message, scheduledAt: now.toISOString() };
    }

    await this.scheduler.cancelPending(settings.pendingNotificationId);
    const notificationId = await this.scheduler.schedule(
      {
        userId,
        profile,
        scheduledAt: dueAt,
        message: candidate.message,
        templateId: candidate.id,
      },
      settings.pendingNotificationId,
    );
    await this.store.updateSettings(userId, { pendingNotificationId: notificationId ?? undefined });
    return {
      scheduled: Boolean(notificationId),
      delivered: false,
      message: candidate.message,
      scheduledAt: dueAt.toISOString(),
    };
  }

  async handleNotificationOpen(userId: EntityId, data: Record<string, unknown>): Promise<string | null> {
    const starterPrompt = typeof data.starterPrompt === 'string' ? data.starterPrompt : null;
    const templateId = typeof data.templateId === 'string' ? data.templateId : 'notification_open';
    if (starterPrompt) {
      await this.store.recordDelivery(userId, {
        message: starterPrompt,
        templateId,
        templateKind: 'contextual',
      });
    }
    return starterPrompt;
  }

  async history(userId: EntityId) {
    return this.store.history(userId);
  }
}

let orchestrator: ProactiveCheckInOrchestrator | null = null;

export function getProactiveCheckInOrchestrator(storage: IStorageService, repositories: VoxaRepositories) {
  if (!orchestrator) orchestrator = new ProactiveCheckInOrchestrator(storage, repositories);
  return orchestrator;
}

export function resetProactiveCheckInOrchestrator() {
  orchestrator = null;
}
