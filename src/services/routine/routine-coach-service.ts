import { STORAGE_KEYS } from '../../constants/storage-keys';
import { CreateReminderInput, ReminderRecurrence } from '../../types';
import { VoxaRepositories, IStorageService } from '../contracts';
import {
  CreateRoutineBlockInput,
  RoutineBlock,
  RoutineDayCompletion,
  RoutineCompletionStatus,
  TodayRoutineSummary,
  UpdateRoutineBlockInput,
  createRoutineBlock,
} from '../../types/routine';
import { createUuid, nowIso } from '../../types';
import { notificationService } from '../notifications/notification-service';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];

export class RoutineCoachService {
  constructor(
    private readonly storage: IStorageService,
    private readonly repositories?: VoxaRepositories,
  ) {}

  async listBlocks(userId: string): Promise<RoutineBlock[]> {
    const all = (await this.storage.getItem<RoutineBlock[]>(STORAGE_KEYS.routineBlocks)) ?? [];
    return all.filter((b) => b.userId === userId).sort((a, b) => a.time.localeCompare(b.time));
  }

  async createBlock(input: CreateRoutineBlockInput): Promise<RoutineBlock> {
    const block = createRoutineBlock(input);
    const blocks = await this.readAll();
    blocks.push(block);
    await this.writeAll(blocks);

    if (this.repositories && block.reminderStyle !== 'silent') {
      const reminder = await this.syncReminderForBlock(block);
      block.reminderId = reminder.id;
      await this.updateBlock(block.id, { reminderId: reminder.id });
    }

    return block;
  }

  async updateBlock(id: string, input: UpdateRoutineBlockInput): Promise<RoutineBlock> {
    const blocks = await this.readAll();
    const index = blocks.findIndex((b) => b.id === id);
    if (index === -1) throw new Error('Routine block not found');

    const updated: RoutineBlock = { ...blocks[index], ...input, updatedAt: nowIso() };
    blocks[index] = updated;
    await this.writeAll(blocks);
    return updated;
  }

  async deleteBlock(id: string): Promise<void> {
    const blocks = await this.readAll();
    const block = blocks.find((b) => b.id === id);
    if (block?.reminderId && this.repositories) {
      await this.repositories.reminders.deleteReminder(block.reminderId).catch(() => undefined);
    }
    await this.writeAll(blocks.filter((b) => b.id !== id));
  }

  async getTodaySchedule(userId: string, date = new Date()): Promise<TodayRoutineSummary> {
    const dayOfWeek = date.getDay();
    const dateKey = date.toISOString().slice(0, 10);
    const blocks = (await this.listBlocks(userId)).filter(
      (b) => b.enabled && b.repeatDays.includes(dayOfWeek),
    );
    const completions = await this.listCompletions(userId, dateKey);
    const enriched = blocks.map((block) => ({
      ...block,
      completion: completions.find((c) => c.blockId === block.id),
    }));

    const completedCount = enriched.filter((b) => b.completion?.status === 'completed').length;
    const totalCount = enriched.length;
    const nowMinutes = date.getHours() * 60 + date.getMinutes();

    const nextBlock =
      enriched
        .filter((b) => !b.completion || b.completion.status === 'snoozed')
        .map((b) => ({ block: b, minutes: timeToMinutes(b.time) }))
        .filter(({ minutes }) => minutes >= nowMinutes)
        .sort((a, b) => a.minutes - b.minutes)[0]?.block ?? null;

    return {
      blocks: enriched,
      completedCount,
      totalCount,
      completionPercent: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      nextBlock,
      streakDays: await this.computeStreak(userId, date),
    };
  }

  async markBlock(
    userId: string,
    blockId: string,
    status: RoutineCompletionStatus,
    date = new Date(),
  ): Promise<RoutineDayCompletion> {
    const dateKey = date.toISOString().slice(0, 10);
    const all = await this.readCompletions();
    const existing = all.find((c) => c.userId === userId && c.blockId === blockId && c.date === dateKey);
    const timestamp = nowIso();

    const entry: RoutineDayCompletion = existing
      ? {
          ...existing,
          status,
          completedAt: status === 'completed' ? timestamp : existing.completedAt,
          updatedAt: timestamp,
        }
      : {
          id: createUuid(),
          userId,
          blockId,
          date: dateKey,
          status,
          completedAt: status === 'completed' ? timestamp : undefined,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

    const next = existing
      ? all.map((c) => (c.id === existing.id ? entry : c))
      : [...all, entry];
    await this.storage.setItem(STORAGE_KEYS.routineCompletions, next);
    if (status === 'completed') {
      const { getAchievementTriggersService } = await import('../phase10/achievement-triggers-service');
      const completed = next.filter((c) => c.userId === userId && c.status === 'completed');
      if (completed.length === 1) {
        void getAchievementTriggersService(this.storage).onRoutineCompleted(userId);
      }
    }
    return entry;
  }

  async snoozeBlock(userId: string, blockId: string, minutes = 15): Promise<RoutineDayCompletion> {
    const snoozedUntil = new Date(Date.now() + minutes * 60_000).toISOString();
    const entry = await this.markBlock(userId, blockId, 'snoozed');
    return this.updateCompletion(entry.id, { snoozedUntil });
  }

  /** Seed wake/sleep from onboarding profile data. */
  async seedFromOnboarding(
    userId: string,
    schedule?: { wake?: string; sleep?: string },
  ): Promise<void> {
    if (!schedule?.wake && !schedule?.sleep) return;
    const existing = await this.listBlocks(userId);
    if (existing.length > 0) return;

    if (schedule.wake) {
      await this.createBlock({
        userId,
        kind: 'wake',
        title: 'Wake up',
        time: schedule.wake,
        repeatDays: ALL_DAYS,
        strictness: 'gentle',
        reminderStyle: 'notification',
      });
    }
    if (schedule.sleep) {
      await this.createBlock({
        userId,
        kind: 'sleep',
        title: 'Wind down for sleep',
        time: schedule.sleep,
        repeatDays: ALL_DAYS,
        strictness: 'gentle',
        reminderStyle: 'voxa_message',
      });
    }
  }

  private async syncReminderForBlock(block: RoutineBlock) {
    if (!this.repositories) throw new Error('Reminders unavailable');

    const [hour, minute] = block.time.split(':').map(Number);
    const scheduled = nextOccurrence(hour, minute);

    const input: CreateReminderInput = {
      userId: block.userId,
      kind: 'check_in',
      title: block.title,
      body: `Routine: ${block.title}`,
      scheduledAt: scheduled.toISOString(),
      recurrence: inferRecurrence(block.repeatDays),
      mode: block.mode,
      allowProactiveCall: block.reminderStyle === 'voxa_message',
      goalId: block.goalId,
    };

    if (block.reminderId) {
      const updated = await this.repositories.reminders.updateReminder(block.reminderId, {
        title: block.title,
        scheduledAt: scheduled.toISOString(),
        recurrence: inferRecurrence(block.repeatDays),
      });
      await notificationService.scheduleReminderFromEntity(updated).catch(() => undefined);
      return updated;
    }

    const reminder = await this.repositories.reminders.createReminder(input);
    await notificationService.scheduleReminderFromEntity(reminder).catch(() => undefined);
    return reminder;
  }

  private async readAll(): Promise<RoutineBlock[]> {
    return (await this.storage.getItem<RoutineBlock[]>(STORAGE_KEYS.routineBlocks)) ?? [];
  }

  private async writeAll(blocks: RoutineBlock[]): Promise<void> {
    await this.storage.setItem(STORAGE_KEYS.routineBlocks, blocks);
  }

  private async readCompletions(): Promise<RoutineDayCompletion[]> {
    return (await this.storage.getItem<RoutineDayCompletion[]>(STORAGE_KEYS.routineCompletions)) ?? [];
  }

  private async listCompletions(userId: string, dateKey: string): Promise<RoutineDayCompletion[]> {
    const all = await this.readCompletions();
    return all.filter((c) => c.userId === userId && c.date === dateKey);
  }

  private async updateCompletion(
    id: string,
    patch: Partial<RoutineDayCompletion>,
  ): Promise<RoutineDayCompletion> {
    const all = await this.readCompletions();
    const index = all.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Completion not found');
    const updated = { ...all[index], ...patch, updatedAt: nowIso() };
    all[index] = updated;
    await this.storage.setItem(STORAGE_KEYS.routineCompletions, all);
    return updated;
  }

  private async computeStreak(userId: string, from: Date): Promise<number> {
    let streak = 0;
    const cursor = new Date(from);
    const blocks = await this.listBlocks(userId);

    for (let i = 0; i < 30; i++) {
      const dayOfWeek = cursor.getDay();
      const dateKey = cursor.toISOString().slice(0, 10);
      const dayBlocks = blocks.filter((b) => b.enabled && b.repeatDays.includes(dayOfWeek));
      if (dayBlocks.length === 0) break;

      const completions = await this.listCompletions(userId, dateKey);
      const completed = dayBlocks.filter((b) =>
        completions.some((c) => c.blockId === b.id && c.status === 'completed'),
      ).length;
      const percent = Math.round((completed / dayBlocks.length) * 100);
      if (percent < 50) break;

      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  }

  async getDailyNudge(userId: string, displayName?: string): Promise<string> {
    const schedule = await this.getTodaySchedule(userId);
    const firstName = displayName?.split(' ')[0] ?? 'there';

    if (schedule.totalCount === 0) {
      return `${firstName}, want to build a simple routine together today?`;
    }

    if (schedule.nextBlock) {
      return `${firstName}, next up: ${schedule.nextBlock.title}. You've got a ${schedule.streakDays}-day streak — one step at a time.`;
    }

    if (schedule.completionPercent >= 100) {
      return `${firstName}, you cleared today's routine. That's ${schedule.streakDays} days of showing up.`;
    }

    return `${firstName}, ${schedule.completedCount}/${schedule.totalCount} done today. Pick one small win and finish strong.`;
  }
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function nextOccurrence(hour: number, minute: number): Date {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  if (date.getTime() <= Date.now()) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}

function inferRecurrence(repeatDays: number[]): ReminderRecurrence {
  if (repeatDays.length === 7) return 'daily';
  if (repeatDays.length === 5 && WEEKDAYS.every((d) => repeatDays.includes(d))) return 'weekdays';
  return 'weekly';
}

let routineCoachService: RoutineCoachService | null = null;

export function getRoutineCoachService(
  storage: IStorageService,
  repositories?: VoxaRepositories,
): RoutineCoachService {
  // Only create once. Passing repositories every call must NOT recreate the instance —
  // that breaks useCallback/useFocusEffect identity and causes infinite re-renders.
  if (!routineCoachService) {
    routineCoachService = new RoutineCoachService(storage, repositories);
  }
  return routineCoachService;
}

export function resetRoutineCoachService() {
  routineCoachService = null;
}
