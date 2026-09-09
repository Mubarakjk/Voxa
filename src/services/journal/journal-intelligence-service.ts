import { CompanionJournalEntry } from './companion-journal-service';
import { DailyCheckInEntry, getDailyCheckInService } from '../check-in/daily-check-in-service';
import { IStorageService, VoxaRepositories } from '../contracts';
import { getDailyReflectionService } from '../reflection/daily-reflection-service';
import { Memory } from '../../types';
import { TalkIntent } from '../ai/companion-intent';
import { DailyReflectionEntry } from '../../types/daily-reflection';
import { resolveDeviceTimeZone, addCalendarDays, instantToZoned } from '../memory/temporal-parse';
import {
  JournalSignal,
  deriveJournalPatterns,
  extractJournalSignal,
  formatExplicitJournalRetrieval,
  formatJournalSignalsForTalk,
  isExplicitJournalRetrieval,
  requestedJournalTheme,
  resolveJournalRange,
  talkIntentSkipsJournalContext,
} from './journal-signal';

const MAX_SIGNAL_ENTRIES = 10;
const LOOKBACK_DAYS = 14;

export function checkInText(entry: DailyCheckInEntry): string {
  return Object.values(entry.answers)
    .filter((value): value is string => Boolean(value?.trim()))
    .join(' ');
}

export function reflectionText(entry: DailyReflectionEntry): string {
  return [entry.answers.smiled, entry.answers.challenged, entry.answers.grateful].filter(Boolean).join(' ');
}

export function deriveSignalsFromSources(input: {
  journals: CompanionJournalEntry[];
  reflections: DailyReflectionEntry[];
  checkIns: DailyCheckInEntry[];
  now: Date;
  timeZone?: string;
}): JournalSignal[] {
  const tz = resolveDeviceTimeZone(input.timeZone);
  const zoned = instantToZoned(input.now, tz);
  const cutoffCivil = addCalendarDays(zoned, -(LOOKBACK_DAYS - 1));
  const cutoff = `${cutoffCivil.year}-${String(cutoffCivil.month).padStart(2, '0')}-${String(cutoffCivil.day).padStart(2, '0')}`;
  const signals: JournalSignal[] = [];

  for (const entry of input.journals) {
    if (entry.date < cutoff) continue;
    signals.push(
      extractJournalSignal({
        id: entry.id,
        source: 'companion_journal',
        dateKey: entry.date,
        text: entry.body,
        isPrivate: entry.isPrivate,
        occurredAt: entry.savedAt,
      }),
    );
  }
  for (const entry of input.reflections) {
    if (entry.date < cutoff) continue;
    signals.push(
      extractJournalSignal({
        id: entry.id,
        source: 'daily_reflection',
        dateKey: entry.date,
        text: reflectionText(entry),
        occurredAt: entry.updatedAt,
      }),
    );
  }
  for (const entry of input.checkIns) {
    if (entry.date < cutoff || entry.skipped) continue;
    signals.push(
      extractJournalSignal({
        id: entry.id,
        source: 'check_in',
        dateKey: entry.date,
        text: checkInText(entry),
        occurredAt: entry.savedAt,
      }),
    );
  }
  return signals.slice(0, MAX_SIGNAL_ENTRIES);
}

export async function loadJournalTalkContext(input: {
  storage: IStorageService;
  repositories?: VoxaRepositories;
  userId: string;
  userMessage: string;
  intent: TalkIntent;
  timeZone?: string;
  now?: Date;
  memories?: Memory[];
}): Promise<{ block: string; loaded: boolean }> {
  if (talkIntentSkipsJournalContext(input.intent)) {
    return { block: '', loaded: false };
  }

  const now = input.now ?? new Date();
  const { getCompanionJournalService } = await import('./companion-journal-service');
  const journalSvc = getCompanionJournalService(input.storage, input.repositories);
  const reflectionSvc = getDailyReflectionService(input.storage);
  const checkInSvc = getDailyCheckInService(input.storage);
  const [journals, reflections, checkIns] = await Promise.all([
    journalSvc.listEntries(),
    reflectionSvc.list(input.userId, LOOKBACK_DAYS),
    checkInSvc.listEntries(),
  ]);

  const explicit = isExplicitJournalRetrieval(input.userMessage);
  if (explicit) {
    const range = resolveJournalRange(input.userMessage, now, input.timeZone);
    const themeFilter = requestedJournalTheme(input.userMessage);
    const retrieved = journals
      .filter((entry) => entry.date >= range.start && entry.date <= range.end)
      .map((entry) => ({ dateKey: entry.date, body: entry.body, isPrivate: entry.isPrivate }));
    const reflected = reflections
      .filter((entry) => entry.date >= range.start && entry.date <= range.end)
      .map((entry) => ({ dateKey: entry.date, body: reflectionText(entry) }));
    const checked = checkIns
      .filter((entry) => entry.date >= range.start && entry.date <= range.end && !entry.skipped)
      .map((entry) => ({ dateKey: entry.date, body: checkInText(entry) }));
    const combined = [...retrieved, ...reflected, ...checked];
    const filtered = themeFilter
      ? combined.filter((entry) => extractJournalSignal({
          id: entry.dateKey,
          source: 'companion_journal',
          dateKey: entry.dateKey,
          text: entry.body,
        }).themes.includes(themeFilter))
      : combined;
    return {
      block: formatExplicitJournalRetrieval({
        entries: filtered,
        rangeLabel: range.label,
        themeFilter,
      }),
      loaded: true,
    };
  }

  const signals = deriveSignalsFromSources({
    journals,
    reflections,
    checkIns,
    now,
    timeZone: input.timeZone,
  });
  const patterns = deriveJournalPatterns(signals);
  return {
    block: formatJournalSignalsForTalk({
      signals,
      patterns,
      userMessage: input.userMessage,
      intent: input.intent,
      explicitRetrieval: false,
      memories: input.memories,
    }),
    loaded: true,
  };
}
