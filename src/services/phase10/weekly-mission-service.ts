import { STORAGE_KEYS } from '../../constants/storage-keys';
import { createUuid, EntityId, nowIso } from '../../types';
import { MissionTask, WeeklyMission, WeeklyMissionStatus } from '../../types/phase10-play';
import { IStorageService } from '../contracts';
import { getAchievementTriggersService } from './achievement-triggers-service';
import { getCelebrationService, buildLevelUpMessage } from './celebration-service';
import { getPlayHistoryService } from './play-history-service';
import { getXpService } from './xp-service';

function weekKey(d = new Date()): string {
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  return start.toISOString().slice(0, 10);
}

export function daysRemainingInWeek(d = new Date()): number {
  return 6 - d.getDay();
}

export function missionCompletionPercent(mission: WeeklyMission): number {
  const active = mission.tasks.filter((t) => !t.skipped);
  if (active.length === 0) return 0;
  const done = active.filter((t) => t.done).length;
  return Math.round((done / active.length) * 100);
}

export function supportiveMissionMessage(mission: WeeklyMission): string {
  const pct = missionCompletionPercent(mission);
  if (mission.status === 'abandoned') return 'Fresh week, fresh start whenever you are ready.';
  if (mission.completed) return 'Mission complete — you built real consistency this week.';
  if (pct >= 75) return 'You are close — finish strong at your own pace.';
  if (pct >= 40) return 'Steady progress beats perfect weeks. One task at a time.';
  if (pct > 0) return 'Any forward motion counts. Pick the easiest win next.';
  return 'No pressure — start when it feels right. I am here with you.';
}

export function buildWeeklyMission(userId: EntityId, streakDays: number): WeeklyMission {
  const wk = weekKey();
  const theme = streakDays >= 7 ? 'Keep the momentum' : 'Become more consistent';
  const tasks: MissionTask[] = [
    { id: createUuid(), label: 'Gym / movement', target: 3, completed: 0, done: false },
    { id: createUuid(), label: 'Code / focus', target: 5, completed: 0, done: false },
    { id: createUuid(), label: 'Journal', target: 2, completed: 0, done: false },
    { id: createUuid(), label: 'Hydration habit', target: 7, completed: 0, done: false },
  ];
  return {
    id: createUuid(),
    userId,
    weekKey: wk,
    title: theme,
    theme,
    tasks,
    xpReward: 150,
    completed: false,
    status: 'pending',
    supportiveMessage: 'Start when you are ready — no guilt, just progress.',
  };
}

export class WeeklyMissionService {
  constructor(private readonly storage: IStorageService) {}

  private storageKey(userId: EntityId) {
    return `${userId}:${weekKey()}`;
  }

  async getCurrent(userId: EntityId): Promise<WeeklyMission | null> {
    const map = (await this.storage.getItem<Record<string, WeeklyMission>>(STORAGE_KEYS.weeklyMissions)) ?? {};
    return map[this.storageKey(userId)] ?? null;
  }

  async ensure(userId: EntityId, _streakDays: number): Promise<WeeklyMission> {
    const existing = await this.getCurrent(userId);
    if (existing) {
      return { ...existing, supportiveMessage: supportiveMissionMessage(existing) };
    }
    const mission = buildWeeklyMission(userId, 0);
    return this.save(mission);
  }

  private async save(mission: WeeklyMission): Promise<WeeklyMission> {
    const withMessage = { ...mission, supportiveMessage: supportiveMissionMessage(mission) };
    const map = (await this.storage.getItem<Record<string, WeeklyMission>>(STORAGE_KEYS.weeklyMissions)) ?? {};
    map[`${mission.userId}:${mission.weekKey}`] = withMessage;
    await this.storage.setItem(STORAGE_KEYS.weeklyMissions, map);
    return withMessage;
  }

  async start(userId: EntityId): Promise<WeeklyMission | null> {
    const m = await this.ensure(userId, 0);
    if (m.status === 'active' || m.status === 'completed') return m;
    return this.save({ ...m, status: 'active', startedAt: nowIso() });
  }

  async completeTask(userId: EntityId, taskId: EntityId): Promise<WeeklyMission | null> {
    const m = await this.getCurrent(userId);
    if (!m || m.status === 'abandoned' || m.status === 'completed') return m;
    const active = m.status === 'pending' ? 'active' : m.status;
    const tasks = m.tasks.map((t) => {
      if (t.id !== taskId || t.skipped) return t;
      const completed = Math.min(t.target, t.completed + 1);
      return { ...t, completed, done: completed >= t.target };
    });
    let mission: WeeklyMission = {
      ...m,
      status: active as WeeklyMissionStatus,
      startedAt: m.startedAt ?? nowIso(),
      tasks,
    };
    mission = await this.maybeCompleteMission(mission);
    return this.save(mission);
  }

  async undoTask(userId: EntityId, taskId: EntityId): Promise<WeeklyMission | null> {
    const m = await this.getCurrent(userId);
    if (!m) return null;
    const tasks = m.tasks.map((t) => {
      if (t.id !== taskId) return t;
      const completed = Math.max(0, t.completed - 1);
      return { ...t, completed, done: completed >= t.target, skipped: false };
    });
    return this.save({
      ...m,
      completed: false,
      completedAt: undefined,
      status: m.status === 'completed' ? 'active' : m.status,
      tasks,
    });
  }

  async skipTask(userId: EntityId, taskId: EntityId): Promise<WeeklyMission | null> {
    const m = await this.getCurrent(userId);
    if (!m || m.status === 'completed') return m;
    const tasks = m.tasks.map((t) =>
      t.id === taskId ? { ...t, skipped: true, done: false } : t,
    );
    let mission: WeeklyMission = {
      ...m,
      status: 'active',
      startedAt: m.startedAt ?? nowIso(),
      tasks,
    };
    mission = await this.maybeCompleteMission(mission);
    return this.save(mission);
  }

  async abandon(userId: EntityId): Promise<WeeklyMission | null> {
    const m = await this.getCurrent(userId);
    if (!m) return null;
    return this.save({ ...m, status: 'abandoned' });
  }

  async restart(userId: EntityId): Promise<WeeklyMission> {
    const fresh = buildWeeklyMission(userId, 0);
    return this.save({ ...fresh, status: 'active', startedAt: nowIso() });
  }

  private async maybeCompleteMission(mission: WeeklyMission): Promise<WeeklyMission> {
    const required = mission.tasks.filter((t) => !t.skipped);
    const allDone = required.length > 0 && required.every((t) => t.done);
    if (!allDone || mission.xpAwarded) return { ...mission, completed: allDone };

    const refId = `mission:${mission.weekKey}:${mission.id}`;
    const award = await getXpService(this.storage).award(mission.userId, mission.xpReward, 'mission', refId);

    void getPlayHistoryService(this.storage).append(mission.userId, {
      kind: 'mission',
      title: mission.title,
      detail: `+${mission.xpReward} XP`,
    });

    const celebration = getCelebrationService(this.storage);
    void celebration.showIfNew(mission.userId, {
      kind: 'mission_complete',
      eventKey: `mission_complete:${mission.weekKey}`,
      title: 'Mission complete',
      subtitle: mission.title,
      emoji: '🛡️',
      amount: mission.xpReward,
    });

    if (award.leveledUp) {
      await celebration.saveLevelUp({
        userId: mission.userId,
        oldLevel: award.oldLevel,
        newLevel: award.newLevel,
        shown: false,
        at: nowIso(),
        message: buildLevelUpMessage(award.newLevel),
      });
    }

    void getAchievementTriggersService(this.storage).onMissionComplete(mission.userId);

    return {
      ...mission,
      completed: true,
      status: 'completed',
      completedAt: nowIso(),
      xpAwarded: true,
      xpTransactionId: award.transaction.id,
    };
  }
}

let instance: WeeklyMissionService | null = null;

export function getWeeklyMissionService(storage: IStorageService) {
  if (!instance) instance = new WeeklyMissionService(storage);
  return instance;
}
