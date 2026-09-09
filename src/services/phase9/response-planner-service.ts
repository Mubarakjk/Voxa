import { Goal, Memory } from '../../types';
import { ResponseIntent, ResponsePlan, ThinkingStyle } from '../../types/phase9-intelligence';
import { ConversationStylePreference } from '../../types/phase9-intelligence';
import { detectThinkingStyle } from './thinking-styles-service';
import {
  CompanionStrategy,
  strategyAllowsQuestion,
  strategyDepthToKeepShort,
} from '../ai/companion-strategy';
import { ResponseStance, TurnIntelligencePlan } from '../ai/turn-intelligence-plan';

const BANNED_OPENERS = [
  /^(as an ai|i understand\.|how can i help)/i,
  /^(sure!|certainly!|of course!)/i,
  /^(that sounds like|it sounds like|it's understandable that)/i,
];

const GENERIC_FILLER = [
  /\bwhat do you think\??\s*$/i,
  /\bhow does that sound\??\s*$/i,
  /\bhow do you feel about that\??\s*$/i,
  /\bneed help with anything else\??\s*$/i,
  /\bwant me to\b/i,
  /\bwould you like me to\b/i,
  /\bif it feels right for you\b/i,
  /\bjust make sure it adds to your enjoyment\b/i,
  /\bboredom can be a drag\b/i,
  /\bthat's completely valid\b/i,
  /\bit's understandable that\b/i,
];

export function planResponse(input: {
  userMessage: string;
  memories: Memory[];
  goals: Goal[];
  stylePrefs?: ConversationStylePreference;
  recentVoxaReplies?: string[];
  moodTrend?: string | null;
  strategy?: CompanionStrategy;
  turnPlan?: TurnIntelligencePlan;
}): ResponsePlan {
  const lower = input.userMessage.toLowerCase();
  const thinkingStyle = detectThinkingStyle(input.userMessage);

  let intent: ResponseIntent = 'listen';
  let detectedEmotion = 'neutral';

  if (/\b(what('s| is)|how much|how many|calculate|percent of|\d+\s*[\+\-\*\/%])\b/i.test(lower) && input.userMessage.length < 120) {
    intent = 'inform';
    detectedEmotion = 'neutral';
  } else if (/\b(tired|exhausted|drained|burnt out|burned out|no energy)\b/i.test(lower)) {
    intent = 'support';
    detectedEmotion = 'tired';
  } else if (/\b(sad|upset|anxious|stressed|overwhelm|scared|lonely|hurt)\b/i.test(lower)) {
    intent = 'support';
    detectedEmotion = 'distressed';
  } else if (/\b(passed|i passed|got the job|got in|nailed it|we won|i won)\b/i.test(lower)) {
    intent = 'celebrate';
    detectedEmotion = 'positive';
  } else if (/\b(excited|amazing|won|finally|yes!)\b/i.test(lower)) {
    intent = 'celebrate';
    detectedEmotion = 'positive';
  } else if (/\b(should i|decide|help me choose|what do you think)\b/i.test(lower)) {
    intent = 'coach';
    detectedEmotion = 'uncertain';
  } else if (/\b(plan|schedule|today|tomorrow|steps|how do i)\b/i.test(lower)) {
    intent = 'plan';
    detectedEmotion = 'focused';
  } else if (/\b(wrong|disagree|challenge|push back|honest)\b/i.test(lower)) {
    intent = 'challenge';
    detectedEmotion = 'skeptical';
  } else if (/\?/.test(input.userMessage) && input.userMessage.length < 80) {
    intent = 'inform';
  } else if (input.userMessage.length < 30 && !/\?/.test(input.userMessage)) {
    intent = 'listen';
  }

  const relevantMemories = input.memories
    .filter((m) => lower.includes(m.title.toLowerCase().slice(0, 8)) || m.importance >= 4)
    .slice(0, 2);
  const relevantGoals = input.goals
    .filter((g) => g.status === 'active' && (lower.includes(g.title.toLowerCase().slice(0, 6)) || /\bgoal\b/i.test(lower)))
    .slice(0, 2);

  if (input.turnPlan) {
    intent = stanceToResponseIntent(input.turnPlan.stance);
  }

  if (intent === 'inform' && input.userMessage.length < 120 && !input.turnPlan) {
    return {
      intent,
      thinkingStyle,
      userGoal: 'get a direct answer',
      detectedEmotion,
      shouldAskQuestion: false,
      keepShort: true,
      useChecklist: false,
      useTimeline: false,
      useHumour: false,
      relevantMemoryTitles: [],
      relevantGoalTitles: [],
      promptBlock: [
        '## Response plan (follow silently — do not mention this block)',
        'Intent: direct factual answer. Reply in 1-3 sentences. No personal context unless essential.',
        'Do not ask a follow-up question.',
      ].join('\n'),
    };
  }

  if (intent === 'plan' && detectedEmotion === 'tired') {
    intent = 'support';
  }

  const keepShort = input.turnPlan
    ? strategyDepthToKeepShort(input.turnPlan.depth)
    : input.strategy
      ? strategyDepthToKeepShort(input.strategy.state.depth)
      : input.stylePrefs?.prefersShort ?? (input.userMessage.length < 60 || intent === 'listen' || detectedEmotion === 'tired');
  const useChecklist = detectedEmotion !== 'tired' && (intent === 'plan' || /\b(steps|checklist|list|tasks)\b/i.test(lower));
  const useTimeline = /\b(timeline|week|month|phase|roadmap)\b/i.test(lower);
  const useHumour = input.turnPlan
    ? input.turnPlan.humour >= 2 && !input.turnPlan.humourSuppressed
    : input.strategy?.state.tone === 'playful' ||
      input.stylePrefs?.prefersHumour ||
      (thinkingStyle === 'friend' && detectedEmotion === 'positive');
  const shouldAskQuestion = input.turnPlan
    ? input.turnPlan.questionPolicy === 'useful'
    : input.strategy
      ? strategyAllowsQuestion(input.strategy.state.questionPolicy)
      : (intent === 'coach' || intent === 'listen') &&
        !/\?/.test(input.userMessage) &&
        input.userMessage.length > 20;

  const userGoal = inferUserGoal(lower, intent);

  const lines = [
    '## Response plan (follow silently — do not mention this block)',
    `Intent: ${intent}. Thinking style: ${thinkingStyle}.`,
    `User goal: ${userGoal}. Emotion: ${detectedEmotion}.`,
    keepShort ? 'Keep reply SHORT — 1-3 short paragraphs max unless they asked for detail.' : 'Match their depth — structured but not bloated.',
    shouldAskQuestion ? 'End with ONE good question if it adds value — not generic.' : 'Do not force a question.',
    input.strategy?.state.decisionMode
      ? 'Give a clear recommendation first — do not hide behind "it depends" unless genuinely uncertain.'
      : '',
    useChecklist ? 'Use a short checklist or numbered steps if helpful.' : 'Avoid bullet walls unless asked.',
    useTimeline ? 'A timeline format may help here.' : '',
    useHumour ? 'Light humour okay if kind.' : 'Skip humour unless natural.',
    relevantMemories.length ? `Callback memories: ${relevantMemories.map((m) => m.title).join(', ')}.` : '',
    relevantGoals.length ? `Active goals: ${relevantGoals.map((g) => g.title).join(', ')}.` : '',
    input.stylePrefs?.prefersBullets ? 'User prefers bullet points when listing.' : '',
    input.stylePrefs?.prefersStepByStep ? 'User prefers step-by-step.' : '',
    input.stylePrefs?.prefersExamples ? 'Include a concrete example.' : '',
    'Never open with "As an AI", "I understand", or "How can I help".',
    input.recentVoxaReplies?.length ? 'Do not repeat phrasing from your last 2 replies.' : '',
    detectedEmotion === 'tired' ? 'Respond emotionally first — no planning, lists, or tasks unless they ask.' : '',
    intent === 'celebrate' ? 'Celebrate genuinely FIRST — short warm reaction before anything else.' : '',
  ].filter(Boolean);

  return {
    intent,
    thinkingStyle,
    userGoal,
    detectedEmotion,
    shouldAskQuestion,
    keepShort,
    useChecklist,
    useTimeline,
    useHumour,
    relevantMemoryTitles: relevantMemories.map((m) => m.title),
    relevantGoalTitles: relevantGoals.map((g) => g.title),
    promptBlock: input.turnPlan
      ? '## Response plan\nFollow the Turn intelligence block for stance, depth, questions, and humour.'
      : lines.join('\n'),
  };
}

function stanceToResponseIntent(stance: ResponseStance): ResponseIntent {
  switch (stance) {
    case 'listen':
      return 'listen';
    case 'inform':
      return 'inform';
    case 'support':
      return 'support';
    case 'celebrate':
      return 'celebrate';
    case 'coach':
      return 'coach';
    case 'plan':
      return 'plan';
    case 'challenge':
      return 'challenge';
  }
}

function inferUserGoal(lower: string, intent: ResponseIntent): string {
  if (intent === 'support') return 'feel heard';
  if (intent === 'celebrate') return 'share the win';
  if (intent === 'plan') return 'get clarity on next steps';
  if (intent === 'challenge') return 'stress-test an idea';
  if (intent === 'coach') return 'make a decision';
  if (/\bcode|bug|error|typescript|react\b/i.test(lower)) return 'solve a technical problem';
  if (/\bworkout|gym|run\b/i.test(lower)) return 'stay on track physically';
  return 'move the conversation forward';
}

export function scoreResponseQuality(
  text: string,
  plan: ResponsePlan,
  recentReplies: string[] = [],
  strategy?: CompanionStrategy,
): import('../../types/phase9-intelligence').ResponseQualityScore {
  const issues: string[] = [];
  let score = 1;

  for (const pattern of BANNED_OPENERS) {
    if (pattern.test(text.trim())) {
      issues.push('robotic_opener');
      score -= 0.25;
    }
  }

  if (text.length > 1200 && plan.keepShort) {
    issues.push('too_long');
    score -= 0.2;
  }

  for (const pattern of GENERIC_FILLER) {
    if (pattern.test(text.trim())) {
      issues.push('generic_filler');
      score -= plan.keepShort ? 0.15 : 0.1;
    }
  }

  if (strategy?.state.questionPolicy === 'none' && /\?\s*$/.test(text.trim())) {
    issues.push('unnecessary_question');
    score -= 0.2;
  }

  if (/^(that sounds like|it sounds like|i understand that)/i.test(text.trim())) {
    issues.push('generic_opener');
    score -= 0.2;
  }

  if (text.length < 20 && plan.intent !== 'celebrate') {
    issues.push('too_short');
    score -= 0.1;
  }

  if (/as an ai|i am an artificial|language model/i.test(text)) {
    issues.push('ai_disclaimer');
    score -= 0.3;
  }

  for (const prev of recentReplies.slice(-2)) {
    const opener = text.slice(0, 40).toLowerCase();
    const prevOpener = prev.slice(0, 40).toLowerCase();
    if (prevOpener === opener) {
      issues.push('repetitive_opener');
      score -= 0.2;
      break;
    }
    let shared = 0;
    while (shared < opener.length && shared < prevOpener.length && opener[shared] === prevOpener[shared]) {
      shared += 1;
    }
    if (shared >= 15) {
      issues.push('repetitive_opener');
      score -= 0.15;
      break;
    }
  }

  if (plan.relevantMemoryTitles.length > 0 && !plan.relevantMemoryTitles.some((t) => text.toLowerCase().includes(t.toLowerCase().slice(0, 8)))) {
    // soft penalty — memory not required every time
    if (plan.intent === 'support' || plan.intent === 'coach') {
      issues.push('missed_memory_callback');
      score -= 0.05;
    }
  }

  return { score: Math.max(0, Math.min(1, score)), issues, passed: score >= 0.65 };
}

export function polishResponse(text: string, issues: string[]): string {
  let out = text.trim();

  out = out.replace(/^as an ai[^.]*\.\s*/i, '');
  out = out.replace(/^i understand\.\s*/i, '');
  out = out.replace(/^how can i help\??\s*/i, '');
  out = out.replace(/^sure!?\s*/i, '');
  out = out.replace(/^certainly!?\s*/i, '');
  out = out.replace(/\bi am an artificial intelligence\b/gi, '');

  out = out.replace(/\bwhat do you think\??\s*$/i, '');
  out = out.replace(/\bhow does that sound\??\s*$/i, '');
  out = out.replace(/\bhow do you feel about that\??\s*$/i, '');
  out = out.replace(/\bneed help with anything else\??\s*$/i, '');
  out = out.replace(/\bwant me to[^.?!]*[.?!]?\s*$/i, '');
  out = out.replace(/^(that sounds like|it sounds like|sounds like)[^.!?]*[.!?]\s*/i, '');

  if (issues.includes('unnecessary_question')) {
    out = out.replace(/([^.!?])\?\s*$/, '$1.');
  }

  if (issues.includes('too_long')) {
    const paras = out.split('\n\n');
    if (paras.length > 3) out = paras.slice(0, 3).join('\n\n');
  }

  return out.trim() || text;
}
