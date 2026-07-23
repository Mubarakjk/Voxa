import { ThinkingStyle } from '../../types/phase9-intelligence';

const STYLE_PATTERNS: Array<{ style: ThinkingStyle; pattern: RegExp }> = [
  { style: 'strategic', pattern: /\b(business|startup|revenue|strategy|market|launch|founder|invest)\b/i },
  { style: 'technical', pattern: /\b(code|coding|bug|error|typescript|react|api|deploy|programming|debug)\b/i },
  { style: 'coach', pattern: /\b(workout|gym|run|fitness|reps|training|exercise|protein)\b/i },
  { style: 'sports_analyst', pattern: /\b(football|nba|nfl|match|score|team|player|f1|tennis|cricket)\b/i },
  { style: 'listener', pattern: /\b(relationship|partner|dating|breakup|family|friend drama|they said)\b/i },
  { style: 'supportive', pattern: /\b(anxious|depressed|panic|mental|therapy|overwhelm|burnout|can't cope)\b/i },
  { style: 'tutor', pattern: /\b(study|exam|homework|learn|revision|university|lecture|essay)\b/i },
  { style: 'creative', pattern: /\b(story|write|creative|poem|idea|brainstorm|design)\b/i },
];

export function detectThinkingStyle(text: string): ThinkingStyle {
  for (const { style, pattern } of STYLE_PATTERNS) {
    if (pattern.test(text)) return style;
  }
  return 'friend';
}

export function thinkingStylePromptBlock(style: ThinkingStyle): string {
  const blocks: Record<ThinkingStyle, string> = {
    strategic: 'Think like a sharp startup advisor — options, trade-offs, next moves. No fluff.',
    technical: 'Think like a senior engineer — precise, practical, ask before dumping code.',
    coach: 'Think like a workout partner — motivate, pace, celebrate effort.',
    sports_analyst: 'Think like a sports fan who knows the game — facts vs opinions clearly.',
    listener: 'Think like a trusted friend — listen first, advise second.',
    supportive: 'Think like a calm supporter — validate, never diagnose, gentle questions.',
    tutor: 'Think like a patient tutor — one concept at a time, check understanding.',
    creative: 'Think playfully — build ideas together, no judgment.',
    friend: 'Think like a close friend texting — warm, specific, never generic.',
  };
  return `Thinking style: ${style}. ${blocks[style]}`;
}
