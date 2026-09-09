import { STORAGE_KEYS } from '../../constants/storage-keys';
import { IStorageService } from '../contracts';
import { MemoryMood, nowIso } from '../../types';

export type CheckInPeriod = 'morning' | 'evening';

export type DailyCheckInEntry = {
  id: string;
  date: string;
  period: CheckInPeriod;
  answers: {
    mood?: string;
    focus?: string;
    helpWith?: string;
    lookingForward?: string;
    worrying?: string;
    priority?: string;
    dayRating?: string;
    wentWell?: string;
    wasDifficult?: string;
    changeTomorrow?: string;
    smiled?: string;
    proud?: string;
    remember?: string;
    tomorrowFeel?: string;
  };
  mood?: MemoryMood;
  skipped?: boolean;
  remindLater?: boolean;
  savedAt: string;
};

export type MoodHistoryEntry = {
  date: string;
  mood: MemoryMood;
  label: string;
  source: 'check_in' | 'journal' | 'conversation' | 'voice' | 'inferred';
  savedAt: string;
};

const MORNING_QUESTIONS = [
  { id: 'mood', label: 'How are you feeling?', placeholder: 'Calm, tired, motivated…' },
  { id: 'lookingForward', label: 'What are you looking forward to?', placeholder: 'Something good today' },
  { id: 'worrying', label: 'Anything worrying you today?', placeholder: 'Optional — share if you want' },
  { id: 'priority', label: "What's today's biggest priority?", placeholder: 'One thing that matters most' },
] as const;

const EVENING_QUESTIONS = [
  { id: 'smiled', label: 'What made you smile today?', placeholder: 'A moment, person, or small win' },
  { id: 'wasDifficult', label: 'What was difficult?', placeholder: 'Optional — what felt hard' },
  { id: 'proud', label: 'What are you proud of?', placeholder: 'Even something small counts' },
  { id: 'remember', label: 'Anything you want me to remember?', placeholder: 'A thought worth keeping' },
  { id: 'tomorrowFeel', label: 'How do you want tomorrow to be?', placeholder: 'One gentle intention' },
] as const;

export function getCheckInQuestions(period: CheckInPeriod) {
  return period === 'morning' ? MORNING_QUESTIONS : EVENING_QUESTIONS;
}

export function shouldOfferCheckIn(entries: DailyCheckInEntry[], now = new Date()): CheckInPeriod | null {
  const date = now.toISOString().slice(0, 10);
  const period = getCurrentCheckInPeriod(now);
  const entry = entries.find((item) => item.date === date && item.period === period);
  if (entry && (!entry.skipped || entry.remindLater)) {
    if (entry.remindLater && !entry.skipped && Object.keys(entry.answers).length === 0) return period;
    if (!entry.skipped) return null;
  }
  if (entry?.skipped) return null;
  return period;
}

export function getCurrentCheckInPeriod(now = new Date()): CheckInPeriod {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 17 || hour < 1) return 'evening';
  return hour < 17 ? 'morning' : 'evening';
}

function moodFromText(text?: string): MemoryMood {
  const value = (text ?? '').toLowerCase();
  if (/great|good|happy|excited|motivated|energ/.test(value)) return 'motivated';
  if (/calm|okay|ok|fine|steady/.test(value)) return 'calm';
  if (/sad|down|low|tired|rough|hard|stress|anx/.test(value)) return 'stressed';
  if (/grateful|warm|love|thank/.test(value)) return 'warm';
  if (/reflect|thought|mixed/.test(value)) return 'reflective';
  return 'neutral';
}

export class DailyCheckInService {
  constructor(private readonly storage: IStorageService) {}

  async listEntries(): Promise<DailyCheckInEntry[]> {
    return (await this.storage.getItem<DailyCheckInEntry[]>(STORAGE_KEYS.dailyCheckIns)) ?? [];
  }

  async getTodayEntry(period: CheckInPeriod): Promise<DailyCheckInEntry | null> {
    const today = new Date().toISOString().slice(0, 10);
    const entries = await this.listEntries();
    return entries.find((entry) => entry.date === today && entry.period === period) ?? null;
  }

  async saveCheckIn(input: {
    period: CheckInPeriod;
    answers: DailyCheckInEntry['answers'];
    skipped?: boolean;
    remindLater?: boolean;
  }): Promise<DailyCheckInEntry> {
    const today = new Date().toISOString().slice(0, 10);
    const entries = await this.listEntries();
    const moodLabel =
      input.answers.mood ??
      input.answers.dayRating ??
      input.answers.smiled ??
      input.answers.proud;
    const entry: DailyCheckInEntry = {
      id: `checkin-${today}-${input.period}`,
      date: today,
      period: input.period,
      answers: input.answers,
      mood: input.skipped || input.remindLater ? undefined : moodFromText(moodLabel),
      skipped: input.skipped,
      remindLater: input.remindLater,
      savedAt: nowIso(),
    };

    const without = entries.filter((item) => item.id !== entry.id);
    without.unshift(entry);
    await this.storage.setItem(STORAGE_KEYS.dailyCheckIns, without.slice(0, 60));

    if (!input.skipped && entry.mood) {
      await this.appendMoodHistory({
        date: today,
        mood: entry.mood,
        label: moodLabel ?? entry.mood,
        source: 'check_in',
        savedAt: entry.savedAt,
      });
    }

    return entry;
  }

  async appendMoodHistory(entry: MoodHistoryEntry) {
    const history = (await this.storage.getItem<MoodHistoryEntry[]>(STORAGE_KEYS.moodHistory)) ?? [];
    const without = history.filter((item) => item.date !== entry.date);
    without.unshift(entry);
    await this.storage.setItem(STORAGE_KEYS.moodHistory, without.slice(0, 90));
  }

  async listMoodHistory(): Promise<MoodHistoryEntry[]> {
    return (await this.storage.getItem<MoodHistoryEntry[]>(STORAGE_KEYS.moodHistory)) ?? [];
  }
}

let instance: DailyCheckInService | null = null;

export function getDailyCheckInService(storage: IStorageService): DailyCheckInService {
  if (!instance) instance = new DailyCheckInService(storage);
  return instance;
}

export function resetDailyCheckInService() {
  instance = null;
}
