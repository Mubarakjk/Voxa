import { MemoryCategory } from '../../types';
import { ExtractedMemoryCandidate } from '../contracts';
import {
  MemoryConfidenceKind,
  MemoryImportanceLevel,
  MemorySemanticSlot,
  TAG_EXPLICIT,
  TAG_INFERRED,
  TAG_OPEN_LOOP,
  TRANSIENT_IMPORTANCE_THRESHOLD,
  inferSemanticSlot,
  importanceFromLevel,
} from './memory-taxonomy';

export type MemoryWriteDecision = {
  shouldPersist: boolean;
  importance: MemoryImportanceLevel;
  confidenceKind: MemoryConfidenceKind;
  confidenceScore: number;
  expiresAt?: string;
  tags: string[];
  semanticSlot: MemorySemanticSlot;
  title: string;
  category: MemoryCategory;
  content: string;
  reason: string;
};

const TRANSIENT_PATTERNS = [
  /^(lol|lmao|haha|jk|just kidding)\b/i,
  /^(yeah|yep|ok|okay|thanks|thank you|cool|nice|sure)\b/i,
  /\b(right now|at the moment|currently eating|just ate)\b/i,
  /\b(maybe|probably|might|perhaps|whatever|nevermind|never mind)\b/i,
];

const EXPLICIT_REMEMBER = /\b(remember that|remember this|don't forget|do not forget)\b/i;
const EXPLICIT_CORRECTION = /\b(that's wrong|that is wrong|actually|i don't anymore|anymore|not anymore|from now on|i switched|i've switched|i have switched|i stopped|i've stopped|i hate|i don't like)\b/i;
const EXPLICIT_CONVERSATIONAL_STYLE =
  /\b(keep your (replies|answers) short|be more direct with me|be more direct|don't ask me loads of questions|don't ask so many questions|i like detailed explanations|be honest and just pick|you can joke with me)\b/i;

const EXPLICIT_PREFERENCE = /\b(i prefer|i like|i love|i usually|i always|my goal is|i'm trying to|i am trying to|i'm working on|i am working on|i'm studying|i'm applying for|my interview is|my exam is)\b/i;

const EVENT_TEMPORAL = /\b(tomorrow|today|tonight|this week|next week|on friday|on monday|due tomorrow|interview is|exam is|deadline)\b/i;

export function assessMemoryWrite(userMessage: string): MemoryWriteDecision | null {
  const text = userMessage.trim();
  if (text.length < 8) return null;

  const lower = text.toLowerCase();
  if (TRANSIENT_PATTERNS.some((pattern) => pattern.test(lower)) && !EXPLICIT_REMEMBER.test(lower)) {
    return null;
  }

  if (EXPLICIT_REMEMBER.test(lower)) {
    const content = text.replace(/remember (that|this)/i, '').replace(/don't forget/i, '').trim();
    return buildDecision({
      content: content || text,
      title: 'User asked to remember',
      category: 'moments',
      importance: 4,
      confidenceKind: 'explicit',
      tags: [TAG_EXPLICIT],
      reason: 'explicit_remember_request',
    });
  }

  if (EXPLICIT_CONVERSATIONAL_STYLE.test(lower) || (/\bfrom now on\b/i.test(lower) && /\b(short|direct|question|joke|detail|replies|answers)\b/i.test(lower))) {
    return buildDecision({
      content: text,
      title: 'Conversation style preference',
      category: 'preferences',
      importance: 4,
      confidenceKind: 'explicit',
      tags: [TAG_EXPLICIT, 'conversational_preference'],
      reason: 'explicit_conversational_preference',
    });
  }

  if (EXPLICIT_CORRECTION.test(lower)) {
    const category = inferCategoryFromText(lower);
    return buildDecision({
      content: text,
      title: inferTitleFromText(lower, category),
      category,
      importance: 4,
      confidenceKind: 'explicit',
      tags: [TAG_EXPLICIT],
      reason: 'explicit_correction',
    });
  }

  if (EXPLICIT_PREFERENCE.test(lower)) {
    const category = inferCategoryFromText(lower);
    const importance: MemoryImportanceLevel =
      /\bmy goal is|working on|trying to|applying for\b/.test(lower) ? 4 : 3;
    return buildDecision({
      content: text,
      title: inferTitleFromText(lower, category),
      category,
      importance,
      confidenceKind: 'explicit',
      tags: [TAG_EXPLICIT],
      reason: 'explicit_statement',
      temporal: EVENT_TEMPORAL.test(lower),
    });
  }

  return null;
}

export function enrichCandidateDecision(
  candidate: ExtractedMemoryCandidate,
  userMessage: string,
): MemoryWriteDecision {
  const explicit = assessMemoryWrite(userMessage);
  const importance = Math.max(
    explicit?.importance ?? 0,
    candidate.importance ?? 2,
  ) as MemoryImportanceLevel;

  if (importance <= TRANSIENT_IMPORTANCE_THRESHOLD) {
    return {
      shouldPersist: false,
      importance,
      confidenceKind: 'inferred',
      confidenceScore: 0.45,
      tags: [TAG_INFERRED],
      semanticSlot: inferSemanticSlot(candidate.category, candidate.content),
      title: candidate.title,
      category: candidate.category,
      content: candidate.content,
      reason: 'importance_too_low',
    };
  }

  const confidenceKind: MemoryConfidenceKind = explicit ? 'explicit' : 'high';
  const tags = mergeTags(candidate.tags, explicit?.tags ?? [TAG_EXPLICIT]);

  return {
    shouldPersist: true,
    importance,
    confidenceKind,
    confidenceScore: confidenceKind === 'explicit' ? 0.92 : 0.78,
    expiresAt: resolveExpiry(candidate.category, candidate.content),
    tags,
    semanticSlot: inferSemanticSlot(candidate.category, candidate.content),
    title: candidate.title,
    category: candidate.category,
    content: candidate.content,
    reason: explicit ? 'explicit_enriched_candidate' : 'rule_candidate',
  };
}

function buildDecision(input: {
  content: string;
  title: string;
  category: MemoryCategory;
  importance: MemoryImportanceLevel;
  confidenceKind: MemoryConfidenceKind;
  tags: string[];
  reason: string;
  temporal?: boolean;
}): MemoryWriteDecision {
  const slot = inferSemanticSlot(input.category, input.content);
  const openLoopTags = input.temporal || slot === 'upcoming_event' ? [TAG_OPEN_LOOP] : [];

  return {
    shouldPersist: input.importance > TRANSIENT_IMPORTANCE_THRESHOLD,
    importance: input.importance,
    confidenceKind: input.confidenceKind,
    confidenceScore: input.confidenceKind === 'explicit' ? 0.92 : 0.75,
    expiresAt: resolveExpiry(input.category, input.content),
    tags: [...input.tags, ...openLoopTags],
    semanticSlot: slot,
    title: input.title,
    category: input.category,
    content: input.content,
    reason: input.reason,
  };
}

function inferCategoryFromText(lower: string): MemoryCategory {
  if (/\b(goal|working toward|trying to)\b/.test(lower)) return 'goals';
  if (/\b(train(?:ing|s|ed)?|gym|workout|exercise|switched to)\b/.test(lower)) return 'fitness';
  if (/\b(study|exam|assignment|class)\b/.test(lower)) return 'study';
  if (/\b(my mom|my dad|my friend|my partner)\b/.test(lower)) return 'people';
  if (/\b(interview|deadline|tomorrow|next week)\b/.test(lower)) return 'moments';
  return 'preferences';
}

function inferTitleFromText(lower: string, category: MemoryCategory): string {
  if (category === 'goals') return 'Personal goal';
  if (category === 'fitness') return 'Training preference';
  if (category === 'study') return 'Study context';
  if (category === 'people') return 'Important person';
  if (category === 'moments') return 'Upcoming event';
  return 'Preference';
}

function resolveExpiry(category: MemoryCategory, content: string): string | undefined {
  const lower = content.toLowerCase();
  const now = new Date();

  if (/\b(tomorrow|due tomorrow|interview is tomorrow|exam is tomorrow)\b/.test(lower)) {
    const expiry = new Date(now);
    expiry.setDate(expiry.getDate() + 3);
    return expiry.toISOString();
  }

  if (/\b(today|tonight|this evening)\b/.test(lower)) {
    const expiry = new Date(now);
    expiry.setDate(expiry.getDate() + 2);
    return expiry.toISOString();
  }

  if (/\b(next week|this week)\b/.test(lower)) {
    const expiry = new Date(now);
    expiry.setDate(expiry.getDate() + 14);
    return expiry.toISOString();
  }

  if (['work', 'business', 'productivity'].includes(category)) {
    const expiry = new Date(now);
    expiry.setDate(expiry.getDate() + 90);
    return expiry.toISOString();
  }

  return undefined;
}

function mergeTags(base: string[] = [], extra: string[] = []): string[] {
  return [...new Set([...base, ...extra].map((tag) => tag.trim()).filter(Boolean))];
}

export function decisionToCandidate(decision: MemoryWriteDecision): ExtractedMemoryCandidate & {
  confidence?: number;
  expiresAt?: string;
} {
  return {
    category: decision.category,
    title: decision.title,
    content: decision.content,
    importance: importanceFromLevel(decision.importance),
    mood: 'neutral',
    tags: decision.tags,
    confidence: decision.confidenceScore,
    expiresAt: decision.expiresAt,
  };
}
