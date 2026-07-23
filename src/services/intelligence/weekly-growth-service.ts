import { getDailyCheckInService, MoodHistoryEntry } from '../check-in/daily-check-in-service';
import { IStorageService, VoxaRepositories } from '../contracts';
import { Goal, Memory } from '../../types';
import { WeeklyGrowthSnapshot } from '../../types/phase3-intelligence';
import { WeeklyRecapData } from '../weekly-recap/weekly-recap-service';

export type BuildWeeklyGrowthInput = {
  recap: WeeklyRecapData | null;
  moodHistory: MoodHistoryEntry[];
  goals: Goal[];
  memories: Memory[];
};

export function buildWeeklyGrowthFromRecap(input: BuildWeeklyGrowthInput): WeeklyGrowthSnapshot | null {
  if (!input.recap) return null;

  const moodInsight = buildMoodInsight(input.moodHistory);
  const headline = input.recap.wins[0] ?? 'Another week with Voxa';

  return {
    weekLabel: input.recap.weekLabel,
    headline,
    achievements: input.recap.wins,
    consistency: input.recap.consistencyLabel,
    moodInsight,
    suggestedFocus: input.recap.suggestedFocus,
    voxaReflection: input.recap.voxaNoticed,
    stats: {
      conversations: input.recap.stats.conversations,
      routinesCompleted: input.recap.stats.completedRoutines,
      memories: input.recap.stats.memories,
      checkIns: input.recap.stats.checkIns,
      journalEntries: input.recap.stats.journalEntries,
    },
  };
}

function buildMoodInsight(moodHistory: MoodHistoryEntry[]): string | null {
  if (moodHistory.length < 3) return null;

  const recent = moodHistory.slice(0, 7);
  const stressed = recent.filter((e) =>
    ['stress', 'sad', 'low', 'anxious'].some((w) => e.label.toLowerCase().includes(w)),
  ).length;
  const positive = recent.filter((e) =>
    ['calm', 'happy', 'motivat', 'good'].some((w) => e.label.toLowerCase().includes(w)),
  ).length;

  if (stressed >= 3) return 'Mood dipped mid-week — self-care and rest mattered.';
  if (positive >= 4) return 'A generally steady, positive emotional week.';
  return 'Mixed moods — normal, and worth noticing.';
}

export class WeeklyGrowthService {
  constructor(
    private readonly storage: IStorageService,
    private readonly repositories?: VoxaRepositories,
  ) {}

  async buildGrowthReport(userId: string): Promise<WeeklyGrowthSnapshot | null> {
    if (!this.repositories) return null;

    const { getWeeklyRecapService } = await import('../weekly-recap/weekly-recap-service');
    const recap = await getWeeklyRecapService(this.storage, this.repositories).buildRecap(userId);

    const moodHistory = this.storage
      ? await getDailyCheckInService(this.storage).listMoodHistory()
      : [];
    const [memories, goals] = await Promise.all([
      this.repositories.memories.listMemories(userId),
      this.repositories.goals.listGoals(userId),
    ]);

    return buildWeeklyGrowthFromRecap({ recap, moodHistory, goals, memories });
  }
}

let instance: WeeklyGrowthService | null = null;

export function getWeeklyGrowthService(storage: IStorageService, repositories?: VoxaRepositories) {
  if (!instance || repositories) instance = new WeeklyGrowthService(storage, repositories);
  return instance;
}
