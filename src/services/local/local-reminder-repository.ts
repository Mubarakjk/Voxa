import { STORAGE_KEYS } from '../../constants/storage-keys';
import {
  CreateReminderInput,
  createId,
  nowIso,
  Reminder,
  UpdateReminderInput,
} from '../../types';
import { asArray } from '../../utils/as-array';
import { IReminderRepository, IStorageService } from '../contracts';

export class LocalReminderRepository implements IReminderRepository {
  constructor(private readonly storage: IStorageService) {}

  private async readAll(): Promise<Reminder[]> {
    return asArray(await this.storage.getItem<Reminder[]>(STORAGE_KEYS.reminders));
  }

  private async writeAll(reminders: Reminder[]): Promise<void> {
    await this.storage.setItem(STORAGE_KEYS.reminders, reminders);
  }

  async listReminders(userId: string): Promise<Reminder[]> {
    const reminders = await this.readAll();
    return reminders
      .filter((item) => item.userId === userId)
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  }

  async listUpcomingCheckIns(userId: string): Promise<Reminder[]> {
    const now = nowIso();
    const reminders = await this.listReminders(userId);
    return reminders.filter(
      (item) =>
        (item.kind === 'check_in' || item.allowProactiveCall) &&
        item.status === 'scheduled' &&
        item.scheduledAt >= now,
    );
  }

  async getReminder(id: string): Promise<Reminder | null> {
    const reminders = await this.readAll();
    return reminders.find((item) => item.id === id) ?? null;
  }

  async createReminder(input: CreateReminderInput): Promise<Reminder> {
    const timestamp = nowIso();
    const reminder: Reminder = {
      id: createId('reminder'),
      userId: input.userId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      scheduledAt: input.scheduledAt,
      recurrence: input.recurrence ?? 'none',
      status: 'scheduled',
      mode: input.mode,
      allowProactiveCall: input.allowProactiveCall ?? input.kind === 'check_in',
      goalId: input.goalId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const reminders = await this.readAll();
    reminders.push(reminder);
    await this.writeAll(reminders);
    return reminder;
  }

  async updateReminder(id: string, input: UpdateReminderInput): Promise<Reminder> {
    const reminders = await this.readAll();
    const index = reminders.findIndex((item) => item.id === id);
    if (index === -1) throw new Error(`Reminder not found: ${id}`);

    const updated: Reminder = {
      ...reminders[index],
      ...input,
      updatedAt: nowIso(),
    };
    reminders[index] = updated;
    await this.writeAll(reminders);
    return updated;
  }

  async deleteReminder(id: string): Promise<void> {
    const reminders = await this.readAll();
    await this.writeAll(reminders.filter((item) => item.id !== id));
  }
}
