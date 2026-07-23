import { IStorageService } from '../services/contracts';
import { getAchievementService } from '../services/phase10/achievement-service';
import { getCelebrationService } from '../services/phase10/celebration-service';
import { getDailyChallengeService } from '../services/phase10/daily-challenge-service';
import { getDailySpinService } from '../services/phase10/daily-spin-service';
import { getWeeklyMissionService } from '../services/phase10/weekly-mission-service';
import { getXpService } from '../services/phase10/xp-service';
import { EntityId } from '../types';

export type PlayDebugSnapshot = {
  xp: string;
  level: string;
  xpToNext: string;
  challengeStatus: string;
  missionStatus: string;
  lastAchievement: string;
  lastCelebration: string;
  spinAvailable: string;
  lastSpinReward: string;
  duplicationGuard: string;
};

export async function getPlayDebugSnapshot(
  userId: EntityId,
  storage: IStorageService,
): Promise<PlayDebugSnapshot> {
  const xp = await getXpService(storage).get(userId);
  const challenge = await getDailyChallengeService(storage).getToday(userId);
  const mission = await getWeeklyMissionService(storage).getCurrent(userId);
  const spin = await getDailySpinService(storage).getState(userId);
  const achievements = await getAchievementService(storage).listWithStatus(userId);
  const lastAch = achievements.filter((a) => a.unlockedAt).sort((a, b) =>
    (b.unlockedAt ?? '').localeCompare(a.unlockedAt ?? ''),
  )[0];
  const lastCelebration = await getCelebrationService(storage).lastCelebrationKey(userId);

  const ledger = await getXpService(storage).listLedger(userId, 5);
  const dupRefs = ledger.filter((t, i, arr) => arr.findIndex((x) => x.referenceId === t.referenceId && t.referenceId) === i);

  return {
    xp: String(xp.totalXp),
    level: String(xp.level),
    xpToNext: String(xp.xpToNextLevel),
    challengeStatus: challenge?.status ?? 'none',
    missionStatus: mission?.status ?? 'none',
    lastAchievement: lastAch ? `${lastAch.emoji} ${lastAch.title}` : '—',
    lastCelebration: lastCelebration ?? '—',
    spinAvailable: spin.spun ? 'no' : 'yes',
    lastSpinReward: spin.reward?.label ?? '—',
    duplicationGuard: ledger.length === dupRefs.length ? 'ok' : 'checking refs',
  };
}
