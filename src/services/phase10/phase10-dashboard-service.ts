import { Goal } from '../../types';
import { Phase10DashboardData, PlayGrowthData, TodaysAdventure } from '../../types/phase10-play';
import { TodayRoutineSummary } from '../../types/routine';
import { IStorageService } from '../contracts';
import { ARCADE_GAMES, pickFeaturedGame } from './arcade-games';
import { getArcadeService } from './arcade-service';
import { getDailyChallengeService } from './daily-challenge-service';
import { getWeeklyMissionService, daysRemainingInWeek, missionCompletionPercent } from './weekly-mission-service';
import { getXpService } from './xp-service';
import { getAchievementService } from './achievement-service';
import { getDailySpinService, formatSpinCountdown, msUntilNextSpin } from './daily-spin-service';
import { getDailySurpriseService } from './daily-surprise-service';
import { pickDailyDeckCard } from './conversation-decks-service';
import { getEnjoymentTrackingService } from './enjoyment-tracking-service';
import { resolveSeasonalEvent } from './seasonal-events-service';
import { getCompanionRewardsService } from './companion-rewards-service';
import { getPlayHistoryService } from './play-history-service';
import { getCelebrationService } from './celebration-service';
import { STORAGE_KEYS } from '../../constants/storage-keys';

export type BuildPhase10Input = {
  userId: string;
  goals: Goal[];
  routine: TodayRoutineSummary;
  streakDays: number;
  messageCount: number;
  memoryCount: number;
  moodLabel?: string | null;
  storage: IStorageService;
};

function daySeed(date: string, userId: string): number {
  let h = 0;
  for (const c of `${date}:${userId}`) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

function buildAdventure(input: {
  challenge: import('../../types/phase10-play').DailyChallenge;
  mission: import('../../types/phase10-play').WeeklyMission;
  spinAvailable: boolean;
  spinCountdownLabel?: string;
  surprise: import('../../types/phase10-play').DailySurprise | null;
  seed: number;
}): TodaysAdventure {
  const featuredGame = pickFeaturedGame(input.seed);
  const deckCard = pickDailyDeckCard(input.seed + 7);
  const missionPercent = missionCompletionPercent(input.mission);
  const missionProgress = `${missionPercent}% · ${daysRemainingInWeek()}d left`;

  let primaryAction: TodaysAdventure['primaryAction'] = 'challenge';
  let primaryLabel = 'View today\'s challenge';
  if (input.challenge.status === 'completed') {
    primaryAction = input.spinAvailable ? 'spin' : 'game';
    primaryLabel = input.spinAvailable ? 'Spin for a reward' : `Play ${featuredGame.title}`;
  } else if (input.challenge.status === 'pending' || input.challenge.status === 'accepted') {
    primaryLabel = input.challenge.status === 'accepted' ? 'Complete challenge' : 'Accept challenge';
  }

  const headline =
    input.surprise && !input.surprise.shown
      ? input.surprise.line
      : input.challenge.status === 'completed'
        ? 'Nice work today'
        : 'Your adventure awaits';

  return {
    headline,
    primaryAction,
    primaryLabel,
    challenge: input.challenge.status !== 'skipped' ? input.challenge : null,
    featuredGame,
    deckCard,
    missionProgress: input.mission.status !== 'abandoned' ? missionProgress : null,
    missionPercent,
    surprise: input.surprise && !input.surprise.shown ? input.surprise : null,
    spinAvailable: input.spinAvailable,
    spinCountdownLabel: input.spinCountdownLabel,
  };
}

async function buildGrowth(userId: string, storage: IStorageService): Promise<PlayGrowthData> {
  const historyService = getPlayHistoryService(storage);
  const arcadeStats = await getArcadeService(storage).getStats(userId);
  const enjoyment = await getEnjoymentTrackingService(storage).get(userId);
  const achievements = await getAchievementService(storage).listWithStatus(userId);
  const streakMap = (await storage.getItem<Record<string, number>>(STORAGE_KEYS.challengeStreak)) ?? {};

  const arcadeHighScores = ARCADE_GAMES.map((g) => ({
    gameId: g.id,
    title: g.title,
    bestScore: arcadeStats[g.id]?.bestScore ?? 0,
    gamesPlayed: arcadeStats[g.id]?.gamesPlayed ?? 0,
  }))
    .filter((g) => g.gamesPlayed > 0)
    .sort((a, b) => b.bestScore - a.bestScore)
    .slice(0, 5);

  return {
    xpHistory: await getXpService(storage).listLedger(userId, 8),
    recentAchievements: achievements.filter((a) => a.unlockedAt).slice(0, 5),
    challengeHistory: await historyService.listChallenges(userId),
    missionHistory: await historyService.listMissions(userId),
    arcadeHighScores,
    favouriteGames: enjoyment.favouriteGames,
    streaks: {
      challenge: streakMap[userId] ?? 0,
      arcade: Math.max(...Object.values(arcadeStats).map((s) => s?.streak ?? 0), 0),
    },
  };
}

const emptyGrowth: PlayGrowthData = {
  xpHistory: [],
  recentAchievements: [],
  challengeHistory: [],
  missionHistory: [],
  arcadeHighScores: [],
  favouriteGames: [],
  streaks: { challenge: 0, arcade: 0 },
};

export async function buildPhase10Dashboard(input: BuildPhase10Input): Promise<Phase10DashboardData> {
  const { userId, storage } = input;
  const today = new Date().toISOString().slice(0, 10);
  const seed = daySeed(today, userId);

  const dailyChallenge = await getDailyChallengeService(storage).ensureToday({
    userId,
    goals: input.goals,
    routine: input.routine,
    moodLabel: input.moodLabel,
  });

  const weeklyMission = await getWeeklyMissionService(storage).ensure(userId, input.streakDays);
  const xp = await getXpService(storage).get(userId);
  void getCompanionRewardsService(storage).unlockForLevel(userId, xp.level);

  const arcadeStats = await getArcadeService(storage).getStats(userId);
  const gamesPlayed = Object.keys(arcadeStats).length;
  const seasonal = resolveSeasonalEvent();
  const streakMap = (await storage.getItem<Record<string, number>>(STORAGE_KEYS.challengeStreak)) ?? {};

  const achievementService = getAchievementService(storage);
  const newlyUnlocked = await achievementService.evaluate({
    userId,
    messageCount: input.messageCount,
    memoryCount: input.memoryCount,
    streakDays: input.streakDays,
    level: xp.level,
    gamesPlayed,
    missionComplete: weeklyMission.completed,
    seasonalActive: Boolean(seasonal),
    challengeStreak: streakMap[userId] ?? 0,
  });

  const achievements = await achievementService.listWithStatus(userId);
  const spin = await getDailySpinService(storage).getState(userId);
  const surprise = await getDailySurpriseService(storage).getToday(userId);
  const enjoyment = await getEnjoymentTrackingService(storage).get(userId);
  const rewards = await getCompanionRewardsService(storage).list(userId);
  const pendingLevelUp = await getCelebrationService(storage).getPendingLevelUp(userId);
  const growth = await buildGrowth(userId, storage);

  const featuredGames = ARCADE_GAMES.slice(seed % 4, (seed % 4) + 4);
  if (featuredGames.length < 4) featuredGames.push(...ARCADE_GAMES.slice(0, 4 - featuredGames.length));

  const spinMs = msUntilNextSpin();
  const adventure = buildAdventure({
    challenge: dailyChallenge,
    mission: weeklyMission,
    spinAvailable: !spin.spun,
    spinCountdownLabel: spin.spun ? formatSpinCountdown(spinMs) : undefined,
    surprise,
    seed,
  });

  return {
    adventure,
    dailyChallenge,
    weeklyMission,
    xp,
    achievements,
    newlyUnlocked,
    spin,
    seasonal,
    enjoyment,
    featuredGames,
    rewards,
    growth,
    pendingLevelUp,
  };
}

export { emptyGrowth };
