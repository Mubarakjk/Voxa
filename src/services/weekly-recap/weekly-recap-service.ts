import { STORAGE_KEYS } from '../../constants/storage-keys';
import { CompanionJournalEntry } from '../journal/companion-journal-service';
import { DailyCheckInEntry } from '../check-in/daily-check-in-service';
import { IStorageService, VoxaRepositories } from '../contracts';
import { Goal, Memory, Message } from '../../types';
import { TodayRoutineSummary } from '../../types/routine';

export type WeeklyRecapData = {
  weekLabel: string;
  wins: string[];
  challenges: string[];
  consistencyLabel: string;
  suggestedFocus: string;
  voxaNoticed: string;
  stats: {
    conversations: number;
    completedRoutines: number;
    skippedRoutines: number;
    memories: number;
    journalEntries: number;
    checkIns: number;
  };
};

const MIN_DATA_POINTS = 2;

export class WeeklyRecapService {
  constructor(
    private readonly storage: IStorageService,
    private readonly repositories?: VoxaRepositories,
  ) {}

  async buildRecap(userId: string): Promise<WeeklyRecapData | null> {
    if (!this.repositories) return null;

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    const weekStartIso = weekStart.toISOString();

    const [conversations, memories, goals, messages, journalEntries, checkIns, routine] = await Promise.all([
      this.repositories.conversations.listConversations(userId),
      this.repositories.memories.listMemories(userId),
      this.repositories.goals.listGoals(userId),
      this.loadRecentMessages(userId),
      this.loadJournalEntries(),
      this.loadCheckIns(),
      this.loadRoutineSummary(userId),
    ]);

    const weekConversations = conversations.filter((item) => item.updatedAt >= weekStartIso);
    const weekMemories = memories.filter((item) => (item.occurredAt ?? item.createdAt) >= weekStartIso);
    const weekMessages = messages.filter((item) => item.createdAt >= weekStartIso);
    const weekJournal = journalEntries.filter((item) => item.savedAt >= weekStartIso);
    const weekCheckIns = checkIns.filter((item) => item.savedAt >= weekStartIso && !item.skipped);
    const activeGoals = goals.filter((goal) => goal.status === 'active');

    const dataPoints =
      weekConversations.length +
      weekMemories.length +
      weekJournal.length +
      weekCheckIns.length +
      (routine?.completedCount ?? 0);

    if (dataPoints < MIN_DATA_POINTS) return null;

    const wins: string[] = [];
    if (routine && routine.completedCount > 0) {
      wins.push(`Completed ${routine.completedCount} routine blocks this week`);
    }
    if (weekCheckIns.length > 0) wins.push(`${weekCheckIns.length} thoughtful check-ins`);
    if (weekMemories.length > 0) wins.push(`${weekMemories.length} moments worth remembering`);
    if (activeGoals.some((goal) => goal.progress >= 25)) {
      const topGoal = [...activeGoals].sort((a, b) => b.progress - a.progress)[0];
      wins.push(`Progress on “${topGoal.title}”`);
    }
    if (wins.length === 0 && weekMessages.length > 0) {
      wins.push('You kept showing up in conversation');
    }

    const challenges: string[] = [];
    if (routine && routine.totalCount > 0 && routine.completionPercent < 60) {
      challenges.push('Routine consistency dipped — a shorter plan may help');
    }
    const difficultCheckIn = weekCheckIns.find((entry) => entry.answers.wasDifficult?.trim());
    if (difficultCheckIn?.answers.wasDifficult) {
      challenges.push(difficultCheckIn.answers.wasDifficult.trim());
    }
    if (challenges.length === 0 && weekCheckIns.length === 0) {
      challenges.push('Fewer check-ins than usual — no pressure, just an observation');
    }

    const consistencyLabel =
      routine && routine.totalCount > 0
        ? `${routine.completionPercent}% routine consistency`
        : weekConversations.length >= 3
          ? 'Steady conversation rhythm'
          : 'A quieter week — still valid';

    const suggestedFocus =
      activeGoals[0]?.title ??
      (routine?.nextBlock ? `Protect time for “${routine.nextBlock.title}”` : 'One small win tomorrow');

    const voxaNoticed =
      weekJournal[0]?.body ??
      (weekMemories[0] ? `You cared about “${weekMemories[0].title}”` : 'You are building a rhythm, even quietly');

    return {
      weekLabel: `${weekStart.toLocaleDateString()} – ${now.toLocaleDateString()}`,
      wins: wins.slice(0, 4),
      challenges: challenges.slice(0, 3),
      consistencyLabel,
      suggestedFocus,
      voxaNoticed,
      stats: {
        conversations: weekConversations.length,
        completedRoutines: routine?.completedCount ?? 0,
        skippedRoutines: Math.max(0, (routine?.totalCount ?? 0) - (routine?.completedCount ?? 0)),
        memories: weekMemories.length,
        journalEntries: weekJournal.length,
        checkIns: weekCheckIns.length,
      },
    };
  }

  private async loadRecentMessages(userId: string): Promise<Message[]> {
    const conversations = await this.repositories!.conversations.listConversations(userId);
    const recent = conversations.slice(0, 5);
    const batches = await Promise.all(
      recent.map((conversation) => this.repositories!.messages.listMessages(conversation.id)),
    );
    return batches.flat();
  }

  private async loadJournalEntries(): Promise<CompanionJournalEntry[]> {
    return (await this.storage.getItem<CompanionJournalEntry[]>(STORAGE_KEYS.companionJournal)) ?? [];
  }

  private async loadCheckIns(): Promise<DailyCheckInEntry[]> {
    return (await this.storage.getItem<DailyCheckInEntry[]>(STORAGE_KEYS.dailyCheckIns)) ?? [];
  }

  private async loadRoutineSummary(userId: string): Promise<TodayRoutineSummary | null> {
    const { getRoutineCoachService } = await import('../routine/routine-coach-service');
    const coach = getRoutineCoachService(this.storage, this.repositories);
    return coach.getTodaySchedule(userId);
  }
}

let instance: WeeklyRecapService | null = null;

export function getWeeklyRecapService(storage: IStorageService, repositories?: VoxaRepositories) {
  if (!instance) instance = new WeeklyRecapService(storage, repositories);
  return instance;
}
