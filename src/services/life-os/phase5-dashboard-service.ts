import { Goal, Memory, UserProfile } from '../../types';
import { TodayRoutineSummary } from '../../types/routine';
import {
  LifeBookChapter,
  Phase5DashboardData,
} from '../../types/phase5-life-os';
import { Phase5LifeOSService } from './phase5-life-os-service';

export async function buildPhase5Dashboard(input: {
  userId: string;
  profile: UserProfile;
  goals: Goal[];
  memories: Memory[];
  routine: TodayRoutineSummary;
  service: Phase5LifeOSService;
}): Promise<Phase5DashboardData> {
  const [vision, bucket, dreams, decisions, coachScore, connections, chapters, storyboards, futureSelf] =
    await Promise.all([
      input.service.listVisionItems(input.userId),
      input.service.listBucketItems(input.userId),
      input.service.listDreams(input.userId, 10),
      input.service.listDecisions(input.userId),
      input.service.getCoachScore(input.userId, input.routine.completionPercent),
      input.service.listMemoryConnections(input.userId),
      input.service.listLifeBookChapters(input.userId),
      input.service.listStoryboards(input.userId),
      input.service.getFutureSelf(input.userId),
    ]);

  const goalPlans = input.goals.filter((g) => g.status === 'active').length;
  const now = new Date();
  let latestChapter: LifeBookChapter | null = chapters[0] ?? null;
  if (!latestChapter) {
    try {
      latestChapter = await input.service.getOrGenerateChapter(input.userId, now.getFullYear(), now.getMonth() + 1);
    } catch {
      latestChapter = null;
    }
  }

  return {
    goalPlans,
    futureSelfReady: Boolean(futureSelf?.identityStatement),
    visionCount: vision.filter((v) => v.status === 'active').length,
    bucketCount: bucket.filter((b) => b.status !== 'completed').length,
    dreamCount: dreams.length,
    openDecisions: decisions.filter((d) => d.status === 'open').length,
    coachScore,
    memoryConnectionCount: connections.length,
    latestLifeBookChapter: latestChapter,
    storyboardReady: storyboards.length > 0,
  };
}
