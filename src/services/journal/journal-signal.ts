/**
 * Phase 2C: local Journal signals. Never put raw private journal text into Talk
 * unless the user explicitly asks to retrieve what they wrote.
 */

import { Memory } from '../../types';
import { TalkIntent } from '../ai/companion-intent';
import { eventsLikelySame } from '../memory/memory-deduplication';
import { detectMemorySensitivity, MemorySensitivityKind } from '../memory/memory-sensitivity';
import {
  isCancelledMemory,
  isResolvedMemory,
  compactEventLabel,
} from '../memory/open-loop-service';
import { isSupersededMemory } from '../memory/memory-taxonomy';
import { parseUserTemporal } from '../memory/temporal-memory';
import {
  addCalendarDays,
  instantToZoned,
  localDayIso,
  resolveDeviceTimeZone,
} from '../memory/temporal-parse';

export type JournalSource = 'companion_journal' | 'daily_reflection' | 'check_in';
export type JournalTone = 'positive' | 'negative' | 'mixed' | 'neutral';
export type JournalCallbackAction = 'mention' | 'use_silently' | 'ignore';
export type JournalConfidence = 'low' | 'medium' | 'high';

export const JOURNAL_PATTERN_MIN_EVIDENCE = 3;

export type JournalSignal = {
  id: string;
  source: JournalSource;
  dateKey: string;
  occurredAt: string;
  themes: string[];
  emotionalTone: JournalTone;
  goalsMentioned: string[];
  eventReferences: string[];
  timeHints: string[];
  unresolvedThemes: string[];
  positiveMoments: string[];
  stressors: string[];
  reflectionDepth: 'light' | 'medium' | 'deep';
  confidence: JournalConfidence;
  sensitivity: MemorySensitivityKind;
  isPrivate: boolean;
};

export type JournalPattern = {
  theme: string;
  tone: JournalTone;
  evidenceCount: number;
  confidence: JournalConfidence;
};

const THEME_RULES: Array<{ theme: string; pattern: RegExp }> = [
  { theme: 'work', pattern: /\b(work|job|office|manager|boss|colleague|shift|deadline)\b/i },
  { theme: 'gym', pattern: /\b(gym|workout|training|exercise|run|boxing)\b/i },
  { theme: 'family', pattern: /\b(mum|mom|dad|sister|brother|family|parents)\b/i },
  { theme: 'driving', pattern: /\b(driving test|driving lesson|drive test)\b/i },
  { theme: 'interview', pattern: /\b(interview)\b/i },
  { theme: 'exam', pattern: /\b(exam|test|assignment)\b/i },
  { theme: 'sleep', pattern: /\b(sleep|insomnia|tired|rest)\b/i },
  { theme: 'project', pattern: /\b(project|app|startup|building)\b/i },
  { theme: 'friends', pattern: /\b(friend|mates|social)\b/i },
  { theme: 'money', pattern: /\b(money|bills|rent|broke)\b/i },
  { theme: 'presentation', pattern: /\b(presentation|presenting)\b/i },
];

const EVENT_RULES = [
  'driving test',
  'interview',
  'exam',
  'deadline',
  'meeting',
  'appointment',
  'presentation',
];

const POSITIVE = /\b(proud|grateful|happy|excited|passed|win|smile|good|great|calm|relieved)\b/i;
const NEGATIVE = /\b(stress|stressed|stressful|nervous|anxious|hate|overwhelmed|difficult|worried|scared|sad|angry|drained)\b/i;
const JOURNAL_SENSITIVE =
  /\b(i hate my|can't tell anyone|dont tell anyone|don't tell anyone|secretly|confess|we fought|argument with|panic attack|my therapist)\b/i;
const TIME_HINTS = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)\b/gi;
const STRESS_TALK = /\b(stress|stressed|lately|recently|been feeling)\b/i;
const FABRICATED_FEELING = /\b(you must have felt|you felt proud|i missed you|we've been through so much)\b/i;

const EXPLICIT_RETRIEVAL =
  /\b(what did i (write|journal)|what was i journaling|what have i been writing|have i mentioned .+ in my journal|read my journal|show me (my |the )?journal|what did i put in my journal)\b/i;

export function isExplicitJournalRetrieval(text: string): boolean {
  return EXPLICIT_RETRIEVAL.test(text.trim());
}

export function talkIntentSkipsJournalContext(intent: TalkIntent): boolean {
  return intent === 'factual_question' || intent === 'app_action_request';
}

export function extractJournalSignal(input: {
  id: string;
  source: JournalSource;
  dateKey: string;
  text: string;
  isPrivate?: boolean;
  occurredAt?: string;
}): JournalSignal {
  const text = input.text.trim();
  const themes = THEME_RULES.filter((rule) => rule.pattern.test(text)).map((rule) => rule.theme);
  const eventReferences = EVENT_RULES.filter((noun) => new RegExp(`\\b${noun}\\b`, 'i').test(text));
  const timeHints = [...new Set((text.toLowerCase().match(TIME_HINTS) ?? []).map((hint) => hint.toLowerCase()))];
  const positive = POSITIVE.test(text);
  const negative = NEGATIVE.test(text);
  const emotionalTone: JournalTone = positive && negative ? 'mixed' : positive ? 'positive' : negative ? 'negative' : 'neutral';
  const detected = detectMemorySensitivity(text);
  const sensitivity: MemorySensitivityKind = JOURNAL_SENSITIVE.test(text)
    ? detected === 'none'
      ? 'conflict'
      : detected
    : detected;
  const words = text.split(/\s+/).filter(Boolean).length;
  const reflectionDepth = words >= 80 ? 'deep' : words >= 25 ? 'medium' : 'light';
  const stressors = negative ? themes.slice(0, 2) : [];
  const positiveMoments = positive ? themes.slice(0, 2) : [];
  const unresolvedThemes = negative || eventReferences.length > 0 ? [...new Set([...themes, ...eventReferences])].slice(0, 3) : [];

  return {
    id: input.id,
    source: input.source,
    dateKey: input.dateKey,
    occurredAt: input.occurredAt ?? `${input.dateKey}T12:00:00.000Z`,
    themes: [...new Set(themes)].slice(0, 4),
    emotionalTone,
    goalsMentioned: themes.filter((theme) => theme === 'project' || theme === 'gym').slice(0, 2),
    eventReferences,
    timeHints,
    unresolvedThemes,
    positiveMoments,
    stressors,
    reflectionDepth,
    confidence: sensitivity !== 'none' || input.isPrivate ? 'low' : themes.length || eventReferences.length ? 'high' : 'medium',
    sensitivity,
    isPrivate: Boolean(input.isPrivate),
  };
}

export function deriveJournalPatterns(signals: JournalSignal[], minEvidence = JOURNAL_PATTERN_MIN_EVIDENCE): JournalPattern[] {
  const buckets = new Map<string, JournalSignal[]>();
  for (const signal of signals) {
    if (signal.isPrivate || signal.sensitivity !== 'none') continue;
    for (const theme of signal.themes) {
      const key = `${theme}:${signal.emotionalTone}`;
      const list = buckets.get(key) ?? [];
      list.push(signal);
      buckets.set(key, list);
    }
  }
  const patterns: JournalPattern[] = [];
  for (const [key, list] of buckets) {
    if (list.length < minEvidence) continue;
    const [theme, tone] = key.split(':') as [string, JournalTone];
    patterns.push({
      theme,
      tone,
      evidenceCount: list.length,
      confidence: list.length >= 5 ? 'high' : 'medium',
    });
  }
  return patterns.sort((a, b) => b.evidenceCount - a.evidenceCount).slice(0, 3);
}

export function decideJournalCallback(input: {
  signal: JournalSignal;
  userMessage: string;
  intent: TalkIntent;
  explicitRetrieval: boolean;
  eventBlocked?: boolean;
}): JournalCallbackAction {
  if (talkIntentSkipsJournalContext(input.intent)) return 'ignore';
  if (input.signal.isPrivate && !input.explicitRetrieval) return 'ignore';
  if (input.eventBlocked) return 'ignore';

  const overlap = themeOverlap(input.userMessage, input.signal);
  if (input.signal.sensitivity !== 'none') {
    if (input.explicitRetrieval && overlap) return 'use_silently';
    if (overlap >= 0.4) return 'use_silently';
    return 'ignore';
  }

  if (input.explicitRetrieval) return 'mention';
  if (!overlap) return 'ignore';
  if (overlap >= 0.35 && (input.intent === 'journaling' || input.intent === 'reflection' || input.intent === 'emotional_support')) {
    return 'mention';
  }
  return 'use_silently';
}

function themeOverlap(userMessage: string, signal: JournalSignal): number {
  const hay = userMessage.toLowerCase();
  const keys = [...signal.themes, ...signal.eventReferences, ...signal.timeHints];
  if (keys.length === 0) return 0;
  const hits = keys.filter((key) => {
    if (hay.includes(key)) return true;
    return key.split(/\s+/).some((part) => part.length > 3 && hay.includes(part));
  }).length;
  return hits / Math.max(keys.length, 1);
}

export function journalSharesEventIdentity(signal: JournalSignal, memory: Memory): boolean {
  const journalText = [...signal.themes, ...signal.eventReferences].join(' ');
  if (!journalText.trim()) return false;
  const label = signal.eventReferences[0] ?? signal.themes[0] ?? 'event';
  return (
    signal.eventReferences.some((ref) => `${memory.title} ${memory.content}`.toLowerCase().includes(ref)) ||
    eventsLikelySame(label, journalText, memory.title, memory.content)
  );
}

export function journalEventBlocked(signal: JournalSignal, memories: Memory[]): boolean {
  if (signal.eventReferences.length === 0 && !signal.themes.includes('driving')) return false;
  return memories.some((memory) => {
    if (!journalSharesEventIdentity(signal, memory)) return false;
    return isResolvedMemory(memory) || isCancelledMemory(memory) || isSupersededMemory(memory);
  });
}

export function formatJournalSignalsForTalk(input: {
  signals: JournalSignal[];
  patterns: JournalPattern[];
  userMessage: string;
  intent: TalkIntent;
  explicitRetrieval: boolean;
  memories?: Memory[];
}): string {
  if (talkIntentSkipsJournalContext(input.intent)) return '';
  const memories = input.memories ?? [];
  const lines: string[] = [];
  for (const signal of input.signals) {
    const blocked = journalEventBlocked(signal, memories);
    const action = decideJournalCallback({
      signal,
      userMessage: input.userMessage,
      intent: input.intent,
      explicitRetrieval: input.explicitRetrieval,
      eventBlocked: blocked,
    });
    if (action === 'ignore') continue;
    const when = signal.dateKey;
    const theme = signal.themes[0] ?? signal.eventReferences[0];
    if (!theme) continue;
    const tone = signal.emotionalTone === 'neutral' ? '' : `, tone ${signal.emotionalTone}`;
    const callback = action === 'mention' ? 'callback allowed' : 'use silently — do not quote Journal';
    lines.push(`- ${theme} (${when}${tone}) — ${callback}`);
  }

  const stressTalk = STRESS_TALK.test(input.userMessage);
  for (const pattern of input.patterns) {
    if (pattern.evidenceCount < JOURNAL_PATTERN_MIN_EVIDENCE) continue;
    const mentioned = input.userMessage.toLowerCase().includes(pattern.theme);
    if (
      !mentioned &&
      !input.explicitRetrieval &&
      input.intent !== 'journaling' &&
      !(stressTalk && pattern.tone === 'negative')
    ) {
      continue;
    }
    lines.push(
      `- Recurring theme: ${pattern.theme} (${pattern.tone}, ${pattern.evidenceCount} notes, ${pattern.confidence} confidence). Do not diagnose. Do not state as fact.`,
    );
  }

  if (lines.length === 0) return '';
  return [
    '## Journal context (derived signals only — never quote private wording unless the user asked to read their Journal)',
    'Journal is evidence. Do not override the turn plan. Never cite Journal as a source unless they asked to retrieve it.',
    ...lines,
  ].join('\n');
}

export function formatExplicitJournalRetrieval(input: {
  entries: Array<{ dateKey: string; body: string; isPrivate?: boolean }>;
  rangeLabel: string;
  themeFilter?: string;
}): string {
  if (input.entries.length === 0) {
    const topic = input.themeFilter ? ` about ${input.themeFilter}` : '';
    return `## Journal retrieval\nNo journal entries found${topic} for ${input.rangeLabel}. Say you do not have that saved. Do not invent entries.`;
  }
  const lines = input.entries.slice(0, 5).map((entry) => {
    const body = entry.body.trim().slice(0, 280);
    return `- ${entry.dateKey}: ${body}`;
  });
  return [
    `## Journal retrieval (${input.rangeLabel})`,
    'The user asked to read their Journal. You may paraphrase or quote these entries. Do not invent extra entries.',
    ...lines,
  ].join('\n');
}

export function requestedJournalTheme(userMessage: string): string | undefined {
  const mentioned = /\bhave i mentioned ([a-z]+)/i.exec(userMessage.trim());
  const theme = mentioned?.[1]?.toLowerCase();
  if (theme && THEME_RULES.some((rule) => rule.theme === theme)) return theme;
  return undefined;
}

export function resolveJournalRange(
  userMessage: string,
  now: Date,
  timeZone?: string,
): { start: string; end: string; label: string } {
  const tz = resolveDeviceTimeZone(timeZone);
  const zoned = instantToZoned(now, tz);
  const today = localDayIso(now, tz);
  const yesterday = civilIso(addCalendarDays(zoned, -1));
  const lower = userMessage.toLowerCase();
  if (/\byesterday\b/.test(lower) || parseUserTemporal(userMessage, now, tz)?.matchedPhrase === 'yesterday') {
    return { start: yesterday, end: yesterday, label: 'yesterday' };
  }
  if (/\btoday\b/.test(lower)) {
    return { start: today, end: today, label: 'today' };
  }
  const mondayOffset = zoned.weekday === 0 ? -6 : 1 - zoned.weekday;
  const thisMonday = civilIso(addCalendarDays(zoned, mondayOffset));
  if (/\blast week\b/.test(lower)) {
    const monday = parseCivil(thisMonday);
    return {
      start: civilIso(addCalendarDays(monday, -7)),
      end: civilIso(addCalendarDays(monday, -1)),
      label: 'last week',
    };
  }
  if (/\bthis week\b/.test(lower) || /\blately\b|\brecently\b/.test(lower)) {
    return { start: thisMonday, end: today, label: 'this week' };
  }
  return { start: today, end: today, label: 'today' };
}

function civilIso(civil: { year: number; month: number; day: number }): string {
  return `${civil.year}-${String(civil.month).padStart(2, '0')}-${String(civil.day).padStart(2, '0')}`;
}

function parseCivil(dateKey: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateKey.split('-').map(Number);
  return { year, month, day };
}

export function suggestReflectionPrompts(input: {
  memories: Memory[];
  now?: Date;
  timeZone?: string;
}): Partial<Record<'smiled' | 'challenged' | 'grateful', string>> {
  const now = input.now ?? new Date();
  const tz = resolveDeviceTimeZone(input.timeZone);
  const today = localDayIso(now, tz);
  const hints: Partial<Record<'smiled' | 'challenged' | 'grateful', string>> = {};

  const resolvedToday = input.memories.find((memory) => {
    if (!isResolvedMemory(memory)) return false;
    if (!memory.updatedAt) return false;
    return localDayIso(new Date(memory.updatedAt), tz) === today || (memory.occurredAt && localDayIso(new Date(memory.occurredAt), tz) === today);
  });
  if (resolvedToday) {
    const label = compactEventLabel(resolvedToday, tz);
    hints.smiled = `${label} was a big moment today. What stood out about it?`;
  }

  const openToday = input.memories.find((memory) => {
    if (isResolvedMemory(memory) || isCancelledMemory(memory) || isSupersededMemory(memory)) return false;
    if (!memory.occurredAt) return false;
    return localDayIso(new Date(memory.occurredAt), tz) === today;
  });
  if (openToday && !hints.smiled) {
    const label = compactEventLabel(openToday, tz);
    hints.challenged = `${label} is still on today. What felt hardest about it?`;
  }

  return hints;
}

export function containsRawPrivateDump(prompt: string, raw: string): boolean {
  const snippet = raw.trim();
  if (snippet.length < 12) return false;
  return prompt.includes(snippet);
}

export function journalPromptFabricatesFeelings(text: string): boolean {
  return FABRICATED_FEELING.test(text);
}

export function journalAutoWritesUserReflection(): false {
  return false;
}
