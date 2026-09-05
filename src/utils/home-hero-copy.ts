/**
 * P5.2 — formats Home hero secondary copy from existing dashboard signals.
 * One concise sentence; no duplicate insights, internal labels, or broken quotes.
 */

export type HomeHeroCopyInput = {
  todayFocusRaw?: string | null;
  activeGoalTitle?: string | null;
  nextRoutineTitle?: string | null;
  followUpTopic?: string | null;
  previousFocus?: string | null;
  rememberMomentContent?: string | null;
  hour?: number;
};

const INTERNAL_LABEL_PATTERNS = [
  /^recent win:\s*/i,
  /^i still remember:\s*/i,
  /^memory:\s*/i,
  /^context:\s*/i,
  /^stored memory:\s*/i,
  /^today(?:'s)? focus:\s*/i,
  /^today your biggest focus is\s*/i,
  /^today(?:'s)? focus is\s*/i,
  /^next up:\s*/i,
  /^yesterday you worked on\s*/i,
];

const COMPOUND_SPLIT = /\.\s*(?=I still remember:|Recent win:|Memory:|Context:|Stored memory:)/i;

const MAX_SUBLINE_CHARS = 118;

/** Strip robotic prefixes and dangling quote/ellipsis artifacts from upstream copy. */
export function stripInternalLabels(text: string): string {
  let result = text.trim();
  if (!result) return '';

  result = result.replace(/^["'`]+|["'`]+\.?$/g, '').trim();

  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of INTERNAL_LABEL_PATTERNS) {
      const next = result.replace(pattern, '').trim();
      if (next !== result) {
        result = next;
        changed = true;
      }
    }
  }

  result = result.replace(/[…]+$/u, '').replace(/\.\.\.$/, '').trim();
  result = result.replace(/\s+"$/g, '').replace(/^"\s+/g, '').trim();

  while (/^["'`]/.test(result) || /["'`]$/.test(result)) {
    const next = result.replace(/^["'`]+/, '').replace(/["'`]+$/, '').trim();
    if (next === result) break;
    result = next;
  }

  return result;
}

/** Split concatenated coach/dashboard strings into separate insight fragments. */
export function splitCompoundInsights(text: string): string[] {
  const raw = text.trim();
  if (!raw) return [];

  const segments = raw
    .split(COMPOUND_SPLIT)
    .flatMap((part) => part.split(/\s+(?=I still remember:|Recent win:|Memory:|Context:)/i))
    .map(stripInternalLabels)
    .filter(Boolean);

  return dedupeInsights(segments.length > 0 ? segments : [stripInternalLabels(raw)].filter(Boolean));
}

export function normalizeForComparison(text: string): string {
  return stripInternalLabels(text)
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** True when two insights describe essentially the same underlying fact. */
export function areSimilarInsights(a: string, b: string): boolean {
  const na = normalizeForComparison(a);
  const nb = normalizeForComparison(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length > nb.length ? na : nb;
  if (shorter.length >= 10 && longer.includes(shorter)) return true;

  const wordsA = new Set(na.split(' ').filter((w) => w.length > 3));
  const wordsB = new Set(nb.split(' ').filter((w) => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return false;

  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap += 1;
  }
  const minSize = Math.min(wordsA.size, wordsB.size);
  return overlap / minSize >= 0.6;
}

/** Word-boundary truncation — last resort when content is still too long. */
export function truncateAtWordBoundary(text: string, maxLen: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;

  const slice = trimmed.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace > maxLen * 0.55 ? slice.slice(0, lastSpace) : slice;
  return cut.replace(/[,;:\-–—\s]+$/u, '').trim();
}

function dedupeInsights(candidates: string[]): string[] {
  const out: string[] = [];
  for (const candidate of candidates) {
    const clean = stripInternalLabels(candidate);
    if (!clean) continue;
    if (out.some((existing) => areSimilarInsights(existing, clean))) continue;
    out.push(clean);
  }
  return out;
}

function isCompleteSentence(text: string): boolean {
  return /[.!?]$/.test(text.trim());
}

function toSecondPersonHabit(text: string): string | null {
  const match = text.match(/^I (normally|usually|often|typically)\s+(.+)$/i);
  if (!match) return null;
  const rest = match[2].replace(/\.$/, '').trim();
  if (!rest) return null;
  return `You ${match[1].toLowerCase()} ${rest}. Ready when you are.`;
}

function formatSingleInsight(insight: string, input: HomeHeroCopyInput): string {
  const clean = stripInternalLabels(insight);
  if (!clean) return '';

  const habit = toSecondPersonHabit(clean);
  if (habit) return habit;

  if (input.activeGoalTitle) {
    const goal = input.activeGoalTitle.trim();
    if (goal && (clean.includes(goal) || normalizeForComparison(clean).includes(normalizeForComparison(goal)))) {
      return `Your focus today is ${goal}.`;
    }
  }

  if (input.nextRoutineTitle) {
    const routine = input.nextRoutineTitle.trim();
    if (routine && normalizeForComparison(clean).includes(normalizeForComparison(routine))) {
      return `Next up: ${routine}.`;
    }
  }

  if (isCompleteSentence(clean) && clean.length <= MAX_SUBLINE_CHARS) {
    return clean;
  }

  const focusBody = clean.replace(/\.$/, '').trim();
  if (!focusBody) return '';

  const sentence = `Your focus today is ${focusBody.charAt(0).toLowerCase()}${focusBody.slice(1)}.`;
  if (sentence.length <= MAX_SUBLINE_CHARS) return sentence;

  return `${truncateAtWordBoundary(sentence, MAX_SUBLINE_CHARS - 1)}.`;
}

function emptyStateFallback(hour: number): string {
  if (hour < 12) return 'What are we getting into today?';
  if (hour < 17) return "I'm here whenever you want to talk.";
  return 'How are you feeling tonight?';
}

function collectCandidates(input: HomeHeroCopyInput): string[] {
  const candidates: string[] = [];

  if (input.followUpTopic?.trim()) {
    candidates.push(input.followUpTopic.trim());
  }
  if (input.activeGoalTitle?.trim()) {
    candidates.push(input.activeGoalTitle.trim());
  }
  if (input.nextRoutineTitle?.trim()) {
    candidates.push(input.nextRoutineTitle.trim());
  }
  if (input.todayFocusRaw?.trim()) {
    candidates.push(...splitCompoundInsights(input.todayFocusRaw));
  }
  if (input.rememberMomentContent?.trim()) {
    candidates.push(input.rememberMomentContent.trim());
  }
  if (input.previousFocus?.trim()) {
    candidates.push(input.previousFocus.trim());
  }

  return dedupeInsights(candidates);
}

function pickPrimaryInsight(candidates: string[], input: HomeHeroCopyInput): string | null {
  if (candidates.length === 0) return null;

  if (input.followUpTopic?.trim()) {
    const topic = input.followUpTopic.trim();
    const match = candidates.find((c) => areSimilarInsights(c, topic));
    if (match) return match;
  }

  if (input.activeGoalTitle?.trim()) {
    const goal = input.activeGoalTitle.trim();
    const match = candidates.find((c) => areSimilarInsights(c, goal) || c.includes(goal));
    if (match) return match;
  }

  if (input.nextRoutineTitle?.trim()) {
    const routine = input.nextRoutineTitle.trim();
    const match = candidates.find((c) => areSimilarInsights(c, routine) || c.includes(routine));
    if (match) return match;
  }

  return candidates[0];
}

/** Build one intentional Home hero subtitle from existing signals. */
export function formatHomeHeroSubline(input: HomeHeroCopyInput): string {
  const hour = input.hour ?? new Date().getHours();
  const candidates = collectCandidates(input);
  const primary = pickPrimaryInsight(candidates, input);

  if (input.followUpTopic?.trim() && primary && areSimilarInsights(primary, input.followUpTopic)) {
    const topic = stripInternalLabels(input.followUpTopic);
    const line = `Still on your mind: ${topic.replace(/\.$/, '')}.`;
    return line.length <= MAX_SUBLINE_CHARS ? line : `${truncateAtWordBoundary(line, MAX_SUBLINE_CHARS - 1)}.`;
  }

  if (primary) {
    const formatted = formatSingleInsight(primary, input);
    if (formatted) return formatted;
  }

  return emptyStateFallback(hour);
}

/** Format a raw dashboard focus line when companion presence is not ready yet. */
export function formatHomeHeroSublineFromRaw(raw: string | null | undefined, hour?: number): string {
  const trimmed = raw?.trim();
  if (!trimmed) return emptyStateFallback(hour ?? new Date().getHours());
  return formatHomeHeroSubline({ todayFocusRaw: trimmed, hour });
}
