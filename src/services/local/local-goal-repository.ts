import { STORAGE_KEYS } from '../../constants/storage-keys';
import {
  CreateGoalInput,
  createId,
  Goal,
  GoalStatus,
  nowIso,
  UpdateGoalInput,
} from '../../types';
import { IGoalRepository, IStorageService } from '../contracts';

export class LocalGoalRepository implements IGoalRepository {
  constructor(private readonly storage: IStorageService) {}

  private async readAll(): Promise<Goal[]> {
    return (await this.storage.getItem<Goal[]>(STORAGE_KEYS.goals)) ?? [];
  }

  private async writeAll(goals: Goal[]): Promise<void> {
    await this.storage.setItem(STORAGE_KEYS.goals, goals);
  }

  async listGoals(userId: string): Promise<Goal[]> {
    const goals = await this.readAll();
    return goals
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async listActiveGoals(userId: string): Promise<Goal[]> {
    const goals = await this.listGoals(userId);
    return goals.filter((item) => item.status === 'active');
  }

  async getGoal(id: string): Promise<Goal | null> {
    const goals = await this.readAll();
    return goals.find((item) => item.id === id) ?? null;
  }

  async createGoal(input: CreateGoalInput): Promise<Goal> {
    const timestamp = nowIso();
    const goal: Goal = {
      id: createId('goal'),
      userId: input.userId,
      title: input.title,
      description: input.description,
      category: input.category,
      status: input.status ?? 'active',
      progress: clampProgress(input.progress ?? 0),
      targetDate: input.targetDate,
      linkedReminderId: input.linkedReminderId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const goals = await this.readAll();
    goals.push(goal);
    await this.writeAll(goals);
    return goal;
  }

  async updateGoal(id: string, input: UpdateGoalInput): Promise<Goal> {
    const goals = await this.readAll();
    const index = goals.findIndex((item) => item.id === id);
    if (index === -1) throw new Error(`Goal not found: ${id}`);

    const updated: Goal = {
      ...goals[index],
      ...input,
      progress: input.progress !== undefined ? clampProgress(input.progress) : goals[index].progress,
      status: (input.status ?? goals[index].status) as GoalStatus,
      updatedAt: nowIso(),
    };
    goals[index] = updated;
    await this.writeAll(goals);
    return updated;
  }

  async deleteGoal(id: string): Promise<void> {
    const goals = await this.readAll();
    await this.writeAll(goals.filter((item) => item.id !== id));
  }
}

function clampProgress(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
