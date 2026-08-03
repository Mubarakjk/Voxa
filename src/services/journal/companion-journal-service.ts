import { getOpenAIApiKey, hasOpenAIApiKey } from '../../config/env';
import { STORAGE_KEYS } from '../../constants/storage-keys';
import { IStorageService, VoxaRepositories } from '../contracts';
import { getRoutineCoachService } from '../routine/routine-coach-service';

export interface CompanionJournalEntry {
  id: string;
  date: string;
  body: string;
  mood?: string;
  isPrivate: boolean;
  savedAt: string;
}

export class CompanionJournalService {
  constructor(
    private readonly storage: IStorageService,
    private readonly repositories?: VoxaRepositories,
  ) {}

  async getTodayEntry(): Promise<CompanionJournalEntry | null> {
    const today = new Date().toISOString().slice(0, 10);
    const entries = await this.listEntries();
    return entries.find((e) => e.date === today) ?? null;
  }

  async listEntries(): Promise<CompanionJournalEntry[]> {
    const raw = await this.storage.getItem<CompanionJournalEntry[]>(STORAGE_KEYS.companionJournal);
    return raw ?? [];
  }

  async generateTodayNote(userId: string): Promise<CompanionJournalEntry> {
    const today = new Date().toISOString().slice(0, 10);
    const existing = await this.getTodayEntry();
    if (existing) return existing;

    const body = await this.composeNote(userId);
    const entry: CompanionJournalEntry = {
      id: `journal-${today}`,
      date: today,
      body,
      isPrivate: false,
      savedAt: new Date().toISOString(),
    };
    const entries = await this.listEntries();
    entries.unshift(entry);
    await this.storage.setItem(STORAGE_KEYS.companionJournal, entries.slice(0, 30));
    return entry;
  }

  async setPrivate(id: string, isPrivate: boolean) {
    const entries = await this.listEntries();
    const idx = entries.findIndex((e) => e.id === id);
    if (idx < 0) return;
    entries[idx] = { ...entries[idx], isPrivate };
    await this.storage.setItem(STORAGE_KEYS.companionJournal, entries);
  }

  async deleteEntry(id: string) {
    const entries = (await this.listEntries()).filter((e) => e.id !== id);
    await this.storage.setItem(STORAGE_KEYS.companionJournal, entries);
  }

  private async composeNote(userId: string): Promise<string> {
    const routineCoach = getRoutineCoachService(this.storage, this.repositories);
    const routine = await routineCoach.getTodaySchedule(userId);
    const memories = this.repositories
      ? await this.repositories.memories.listMemories(userId)
      : [];
    const goals = this.repositories ? await this.repositories.goals.listGoals(userId) : [];
    const activeGoals = goals.filter((g) => g.status === 'active').slice(0, 3);

    const context = [
      routine.totalCount > 0 ? `Routine: ${routine.completionPercent}% done today` : null,
      activeGoals.length ? `Goals: ${activeGoals.map((g) => g.title).join(', ')}` : null,
      memories.length ? `Recent: ${memories.slice(0, 3).map((m) => m.content.slice(0, 50)).join(' · ')}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    if (!hasOpenAIApiKey()) {
      return context
        ? `Today you showed up — ${context.split('\n')[0]}. Keep going.`
        : 'A quiet day is still worth noting. Voxa is here when you need.';
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getOpenAIApiKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Write a warm 2–3 sentence daily companion journal note for the user. Personal, not generic. No bullet points.',
          },
          { role: 'user', content: context || 'No specific data — write a gentle check-in.' },
        ],
        max_tokens: 120,
      }),
    });

    if (!response.ok) {
      return 'Today is yours — Voxa noticed you checking in. That counts.';
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return json.choices?.[0]?.message?.content?.trim() ?? 'Today is yours — Voxa is glad you showed up.';
  }
}

let instance: CompanionJournalService | null = null;

export function getCompanionJournalService(
  storage: IStorageService,
  repositories?: VoxaRepositories,
): CompanionJournalService {
  // Singleton — do not recreate when repositories is passed on every render.
  if (!instance) {
    instance = new CompanionJournalService(storage, repositories);
  }
  return instance;
}

export function resetCompanionJournalService() {
  instance = null;
}
