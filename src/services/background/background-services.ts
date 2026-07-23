import { UserProfile, Goal, Memory, Reminder } from '../../types';
import { VoxaRepositories } from '../contracts';
import { buildDailyBriefing } from '../../utils/daily-briefing';
import { notificationService } from '../notifications/notification-service';
import { createProactiveCompanionCoordinator, ProactiveCompanionCoordinator } from '../proactive/proactive-companion-registry';
import { getProactiveCheckInOrchestrator, ProactiveCheckInOrchestrator } from '../proactive-check-ins/proactive-check-in-orchestrator';

export class DailyBriefingService {
  constructor(private readonly repositories: VoxaRepositories) {}

  async generateForUser(userId: string) {
    const profile = await this.repositories.userProfile.getProfile();
    if (!profile) throw new Error('Profile not found');

    const [memories, reminders, activeGoals] = await Promise.all([
      this.repositories.memories.listMemories(userId),
      this.repositories.reminders.listReminders(userId),
      this.repositories.goals.listActiveGoals(userId),
    ]);

    return buildDailyBriefing({ profile, memories, reminders, activeGoals });
  }
}

export class MorningMessageService {
  constructor(private readonly briefing: DailyBriefingService) {}

  async generate(userId: string) {
    const briefing = await this.briefing.generateForUser(userId);
    return briefing.greeting;
  }
}

export class EveningReflectionService {
  async generate(profile: UserProfile) {
    return `${profile.displayName}, how did today feel? I'm here if you want to reflect before bed.`;
  }
}

export class ReminderSchedulerService {
  constructor(private readonly repositories: VoxaRepositories) {}

  async syncReminderNotifications(userId: string) {
    const reminders = await this.repositories.reminders.listReminders(userId);
    const upcoming = reminders.filter(
      (item) => item.status === 'scheduled' && new Date(item.scheduledAt) > new Date(),
    );

    for (const reminder of upcoming) {
      if (reminder.notificationId) {
        await notificationService.cancelNotification(reminder.notificationId).catch(() => undefined);
      }
      const notificationId = await notificationService.scheduleReminderFromEntity(reminder);
      if (reminder.notificationId !== notificationId) {
        await this.repositories.reminders.updateReminder(reminder.id, { notificationId });
      }
    }
  }

  async scheduleReminder(userId: string, reminder: Reminder) {
    const notificationId = await notificationService.scheduleReminderFromEntity(reminder);
    return this.repositories.reminders.updateReminder(reminder.id, { notificationId });
  }
}

export class MemoryIndexingService {
  constructor(private readonly repositories: VoxaRepositories) {}

  async indexForUser(userId: string): Promise<Memory[]> {
    const memories = await this.repositories.memories.listMemories(userId);
    return memories.sort(
      (a, b) =>
        (b.importance - a.importance) ||
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  async topHighlights(userId: string, limit = 3): Promise<Memory[]> {
    const indexed = await this.indexForUser(userId);
    return indexed.slice(0, limit);
  }
}

export class GoalProgressService {
  constructor(private readonly repositories: VoxaRepositories) {}

  async listActiveWithProgress(userId: string): Promise<Goal[]> {
    return this.repositories.goals.listActiveGoals(userId);
  }

  async bumpProgress(goalId: string, delta: number) {
    const goal = await this.repositories.goals.getGoal(goalId);
    if (!goal) return null;
    const progress = Math.min(100, Math.max(0, goal.progress + delta));
    return this.repositories.goals.updateGoal(goalId, { progress });
  }
}

export class BackgroundServices {
  readonly dailyBriefing: DailyBriefingService;
  readonly morningMessage: MorningMessageService;
  readonly eveningReflection: EveningReflectionService;
  readonly reminderScheduler: ReminderSchedulerService;
  readonly memoryIndexing: MemoryIndexingService;
  readonly goalProgress: GoalProgressService;
  readonly proactive: ProactiveCompanionCoordinator;
  readonly proactiveCheckIns: ProactiveCheckInOrchestrator;
  readonly notifications = notificationService;

  constructor(repositories: VoxaRepositories, storage: import('../contracts').IStorageService) {
    this.dailyBriefing = new DailyBriefingService(repositories);
    this.morningMessage = new MorningMessageService(this.dailyBriefing);
    this.eveningReflection = new EveningReflectionService();
    this.reminderScheduler = new ReminderSchedulerService(repositories);
    this.memoryIndexing = new MemoryIndexingService(repositories);
    this.goalProgress = new GoalProgressService(repositories);
    this.proactive = createProactiveCompanionCoordinator();
    this.proactiveCheckIns = getProactiveCheckInOrchestrator(storage, repositories);
  }

  async runStartupTasks(userId: string, profile: UserProfile) {
    if (profile.preferences.morningGreetingEnabled || profile.preferences.eveningReflectionEnabled) {
      await notificationService.requestPermissions();
      await notificationService.scheduleDailyCheckIns(userId, {
        morningEnabled: profile.preferences.morningGreetingEnabled ?? true,
        eveningEnabled: profile.preferences.eveningReflectionEnabled ?? true,
      });
    }
    await this.reminderScheduler.syncReminderNotifications(userId);
    await this.proactiveCheckIns.sync(userId, profile);
  }
}

export function createBackgroundServices(repositories: VoxaRepositories, storage: import('../contracts').IStorageService) {
  return new BackgroundServices(repositories, storage);
}
