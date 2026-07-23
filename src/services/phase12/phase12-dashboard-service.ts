import { EntityId } from '../../types';
import { Goal, Memory, UserProfile } from '../../types';
import { CompanionIntelligenceBundle } from '../../types/companion-intelligence';
import { Phase12DashboardData, Phase12HomeMoment } from '../../types/phase12-experiences';
import { TodayRoutineSummary } from '../../types/routine';
import { IStorageService } from '../contracts';
import { getScheduledCheckInService } from './scheduled-check-in-service';
import { getWeeklyLetterService } from './weekly-letter-service';
import { getComposerPreferencesService } from './composer-preferences-service';
import { getPhotoMemoryService } from './photo-memory-service';
import { getMoodJournalService, getMoodInsightsEngine } from './mood-journal-service';
import { getCoachingService } from './coaching-service';
import { getConversationWorldsService } from './conversation-worlds-service';
import { buildVerifiedMilestones, getRelationshipTimelineService } from './relationship-timeline-service';
import { getCompanionChallengeV2Service } from './companion-challenge-v2-service';
import { getCosmeticRewardsService } from './cosmetic-rewards-service';
import { getDailyNewsService } from './daily-news-service';

export type BuildPhase12Input = {
  userId: EntityId;
  profile: UserProfile;
  bundle: CompanionIntelligenceBundle;
  memories: Memory[];
  goals: Goal[];
  routine: TodayRoutineSummary;
  todayFocus?: string | null;
  messageCount?: number;
  ritualStreak?: number;
  storage?: IStorageService;
};

export async function buildPhase12Dashboard(input: BuildPhase12Input): Promise<Phase12DashboardData> {
  const empty: Phase12DashboardData = {
    nextCheckIn: null,
    checkInPermission: 'undetermined',
    nextCheckInLabel: null,
    weeklyLetter: null,
    weeklyLetterReady: false,
    photoCount: 0,
    featuredPhoto: null,
    moodLoggedToday: false,
    moodInsight: null,
    activeCoach: null,
    activeWorld: null,
    timelinePreview: [],
    activeChallenge: null,
    newRewards: [],
    dailyNews: null,
    homeMoment: null,
    composerPrefs: { userId: input.userId, favouriteActionIds: [], recentActionIds: [], updatedAt: new Date().toISOString() },
  };

  if (!input.storage) return empty;

  const storage = input.storage;
  const checkIns = getScheduledCheckInService(storage);
  const photos = getPhotoMemoryService(storage);
  const mood = getMoodJournalService(storage);
  const insights = getMoodInsightsEngine(storage);
  const coaching = getCoachingService(storage);
  const worlds = getConversationWorldsService(storage);
  const timeline = getRelationshipTimelineService(storage);
  const challenges = getCompanionChallengeV2Service(storage);
  const cosmetics = getCosmeticRewardsService(storage);
  const news = getDailyNewsService(storage);
  const letters = getWeeklyLetterService(storage);
  const composer = getComposerPreferencesService(storage);

  await cosmetics.seedDefaults(input.userId);

  const [nextCheckIn, permission, photoList, moodToday, moodEntries, activeCoach, worldPrefs, activeChallenge, rewards, composerPrefs] =
    await Promise.all([
      checkIns.getNext(input.userId),
      checkIns.getPermissionState(),
      photos.list(input.userId),
      mood.getToday(input.userId),
      mood.list(input.userId, 30),
      coaching.getActive(input.userId),
      worlds.getPreferences(input.userId),
      challenges.getActive(input.userId),
      cosmetics.list(input.userId),
      composer.get(input.userId),
    ]);

  const onThisDay = await photos.onThisDay(input.userId);
  const featuredPhoto = photoList.find((p) => p.favourite) ?? onThisDay ?? photoList[0] ?? null;

  const verified = buildVerifiedMilestones({
    userId: input.userId,
    bundle: input.bundle,
    memories: input.memories,
    goals: input.goals,
    photos: photoList,
    conversationCount: input.bundle.relationship.conversationCount,
    messageCount: input.messageCount,
    ritualStreak: input.ritualStreak,
  });
  const timelinePreview = await timeline.sync(input.userId, verified);

  const moodInsight = await insights.generate(input.userId, moodEntries, moodEntries.filter((e) => e.tags.includes('gym')).map((e) => e.date));

  const firstName = input.profile.displayName.split(' ')[0] || input.profile.displayName;
  const weeklyLetter = await letters.generate({
    userId: input.userId,
    firstName,
    bundle: input.bundle,
    memories: input.memories,
    goals: input.goals,
    routine: input.routine,
    conversationCount: input.bundle.relationship.conversationCount,
    challengeTitle: activeChallenge?.title ?? null,
    moodNote: moodToday?.note ?? null,
    photoTitle: featuredPhoto?.title ?? null,
  });

  const dailyNews = await news.build({
    userId: input.userId,
    firstName,
    goals: input.goals,
    memories: input.memories,
    todayFocus: input.todayFocus,
    streakDays: input.routine.streakDays,
  });

  const nextLabel = nextCheckIn
    ? `Scheduled Voxa check-in · ${nextCheckIn.title}`
    : null;

  const homeMoment = pickHomeMoment({
    nextCheckIn,
    weeklyLetter,
    featuredPhoto,
    activeChallenge,
    dailyNews,
    moodLoggedToday: !!moodToday,
  });

  const newRewards = rewards.filter((r) => {
    if (!r.unlockedAt) return false;
    const hours = (Date.now() - new Date(r.unlockedAt).getTime()) / 3600000;
    return hours < 48;
  });

  return {
    nextCheckIn,
    checkInPermission: permission,
    nextCheckInLabel: nextLabel,
    weeklyLetter,
    weeklyLetterReady: weeklyLetter !== null,
    photoCount: photoList.length,
    featuredPhoto,
    moodLoggedToday: !!moodToday,
    moodInsight,
    activeCoach,
    activeWorld: worldPrefs.lastUsedWorldId ?? null,
    timelinePreview: timelinePreview.slice(0, 5),
    activeChallenge,
    newRewards,
    dailyNews,
    homeMoment,
    composerPrefs,
  };
}

function pickHomeMoment(input: {
  nextCheckIn: Phase12DashboardData['nextCheckIn'];
  weeklyLetter: Phase12DashboardData['weeklyLetter'];
  featuredPhoto: Phase12DashboardData['featuredPhoto'];
  activeChallenge: Phase12DashboardData['activeChallenge'];
  dailyNews: Phase12DashboardData['dailyNews'];
  moodLoggedToday: boolean;
}): Phase12HomeMoment | null {
  if (input.nextCheckIn) {
    return {
      kind: 'check_in',
      title: 'Scheduled check-in',
      subtitle: input.nextCheckIn.title,
      actionLabel: 'Open when ready',
    };
  }
  if (input.weeklyLetter && new Date().getDay() === 0) {
    return { kind: 'letter', title: 'Weekly letter', subtitle: input.weeklyLetter.opening.slice(0, 80), letterId: input.weeklyLetter.id };
  }
  if (input.featuredPhoto) {
    return { kind: 'photo', title: 'Photo memory', subtitle: input.featuredPhoto.title, photoId: input.featuredPhoto.id };
  }
  if (input.activeChallenge) {
    return { kind: 'challenge', title: input.activeChallenge.title, subtitle: input.activeChallenge.dailyTarget, challengeId: input.activeChallenge.id };
  }
  if (input.dailyNews) {
    return { kind: 'news', title: 'Daily update', subtitle: input.dailyNews.companionTake };
  }
  if (!input.moodLoggedToday) {
    return { kind: 'mood', title: 'Mood check', subtitle: 'Quick log — mood, energy, sleep.' };
  }
  return null;
}
