import { CompanionModeId, Memory, UserProfile } from '../../types';
import { ConversationStylePreference } from '../../types/phase9-intelligence';
import { WarmthLevel } from '../../types/voice-identity';
import { resolveVoiceIdentity } from '../voice/voice-identity-resolver';
import { TalkIntent } from './companion-intent';
import {
  CompanionStrategy,
  ConversationState,
  QuestionPolicy,
  ResponseDepth,
  buildCompanionStrategy,
} from './companion-strategy';

export type ResponseStance =
  | 'listen'
  | 'inform'
  | 'support'
  | 'celebrate'
  | 'coach'
  | 'plan'
  | 'challenge';

export type HumourLevel = 0 | 1 | 2 | 3;

export type MemoryPolicy = 'skip' | 'recall' | 'high_confidence_only';

export type CallbackPolicy = 'none' | 'optional';

export type RelationshipTone = 'new_user' | 'familiar' | 'long_term';

export type SessionStyleSignals = {
  recentUserAvgChars: number;
  recentTinyCasual: boolean;
  usedEmoji: boolean;
  askedShort: boolean;
  askedDirect: boolean;
  joking: boolean;
  rejectedAdvice: boolean;
  becameSerious: boolean;
};

export type TurnIntelligencePlan = {
  intent: TalkIntent;
  stance: ResponseStance;
  depth: ResponseDepth;
  questionPolicy: QuestionPolicy;
  humour: HumourLevel;
  humourSuppressed: boolean;
  warmth: WarmthLevel;
  memoryPolicy: MemoryPolicy;
  callbackPolicy: CallbackPolicy;
  relationshipTone: RelationshipTone;
  selectedMode: CompanionModeId;
  state: ConversationState;
  sessionStyle: SessionStyleSignals;
  promptBlock: string;
};

export const TURN_INTELLIGENCE_HEADING =
  '## Turn intelligence (authoritative for this reply — overrides warmer/vaguer style notes above and below)';
export const TURN_INTELLIGENCE_END = '## End turn intelligence';

export type RelationshipToneSignals = {
  conversationCount: number;
  daysTogether: number;
};

const VENT_LISTEN =
  /\b(just (need to )?vent|don't want advice|do not want advice|i just need to (talk|vent)|please just listen|not looking for advice|no advice)\b/i;

const CHALLENGE_ME =
  /\b(be real|be honest with me|am i procrastinat|tell me straight|don't sugarcoat|dont sugarcoat|challenge (my|me)|push back)\b/i;

const MICRO_REACTION =
  /^(yo|lol|lmao|omg|nah|no way|what+|wtf|bro|damn|😭|😂|💀|💀💀)(\s|$)/i;

const DEEP_PLANNING =
  /\b(over the next (month|few weeks|weeks)|prepare for|everything i need|university|roadmap|break it down|in detail)\b/i;

const HUMOUR_SUPPRESS =
  /\b(died|dies|dying|funeral|griev(e|ing)|passed away|lost my (mum|mom|dad|brother|sister|child|wife|husband)|suicide|suicidal|self-?harm|want to die|kill myself|overdose|emergency|chest pain|ambulance|hospitalis|diagnos(is|ed)|cancer|terminal|abuse|abusive|domestic violence|assault|divorce papers|restraining order|911|999|overdose)\b/i;

const MEDICAL_SERIOUS =
  /\b(hospital|icu|surgery|seizure|heart attack|stroke|ER\b|A&E)\b/i;

const SESSION_SHORT =
  /\b(keep it short|keep your (replies|answers) short|be brief|just the answer|tldr|tl;?dr|short answers|less text)\b/i;

const SESSION_DIRECT =
  /\b(be real|be honest with me|tell me straight|don't sugarcoat|dont sugarcoat|just tell me|answer first|be more direct)\b/i;

const SESSION_JOKE = /\b(lol|lmao|haha|jk\b|just kidding|😂|💀|😭)\b/i;

const SESSION_CASUAL = /\b(yo|gonna|wanna|nah|yeah|lol|tbh|ngl|lowkey|idk|wont|won't believe)\b/i;

const SESSION_DETAIL = /\b(in detail|explain thoroughly|walk me through|go deep)\b/i;

export function resolveAuthoritativeTalkMode(userSelectedMode: CompanionModeId): CompanionModeId {
  return userSelectedMode;
}

export function resolveRelationshipTone(signals: RelationshipToneSignals): RelationshipTone {
  const chats = Math.max(0, signals.conversationCount);
  const days = Math.max(0, signals.daysTogether);
  if (chats >= 80 || days >= 180) return 'long_term';
  if (chats >= 15 || days >= 21) return 'familiar';
  return 'new_user';
}

export function resolveMemoryPolicy(intent: TalkIntent): MemoryPolicy {
  if (intent === 'factual_question' || intent === 'app_action_request') return 'skip';
  if (intent === 'memory_recall' || intent === 'goal_progress' || intent === 'planning') return 'recall';
  if (
    intent === 'casual_conversation' ||
    intent === 'celebration' ||
    intent === 'unknown' ||
    intent === 'advice'
  ) {
    return 'high_confidence_only';
  }
  return 'recall';
}

export function humourIsSuppressed(userMessage: string, intent: TalkIntent, stance: ResponseStance): boolean {
  if (intent === 'factual_question' || intent === 'app_action_request') return true;
  const lower = userMessage.toLowerCase();
  if (HUMOUR_SUPPRESS.test(lower) || MEDICAL_SERIOUS.test(lower)) return true;
  if (stance === 'support' && /\b(hopeless|can't cope|scared|grief|grieving)\b/i.test(lower)) return true;
  return false;
}

export function buildTurnIntelligencePlan(input: {
  userMessage: string;
  selectedMode: CompanionModeId;
  strategy?: CompanionStrategy;
  userProfile?: UserProfile;
  stylePrefs?: ConversationStylePreference;
  relationship?: RelationshipToneSignals;
  memories?: Memory[];
  history?: import('../../types').Message[];
  recentVoxaReplies?: string[];
}): TurnIntelligencePlan {
  const strategy =
    input.strategy ??
    buildCompanionStrategy({
      talkIntent: { intent: 'unknown', referencesRecentTurns: false },
      userMessage: input.userMessage,
      history: input.history ?? [],
      memories: input.memories,
      stylePrefs: input.stylePrefs,
      recentVoxaReplies: input.recentVoxaReplies,
    });

  const intent = strategy.state.intent;
  const text = input.userMessage.trim();
  const sessionStyle = inferSessionStyleSignals(text, input.history);
  const stance = resolveStance(text, intent);
  let depth = resolveDepth(text, strategy.state.depth, stance, intent, sessionStyle);
  if (sessionStyle.askedShort && depth === 'deep' && !SESSION_DETAIL.test(text)) {
    depth = 'short';
  } else if (sessionStyle.askedShort && depth === 'normal') {
    depth = 'short';
  }
  if (sessionStyle.recentTinyCasual && (stance === 'listen' || stance === 'celebrate') && depth === 'normal') {
    depth = 'micro';
  }
  const questionPolicy = resolveQuestionPolicy(text, strategy.state.questionPolicy, stance, intent, depth);
  const humourSuppressed = humourIsSuppressed(text, intent, stance);
  const humour = resolveHumourLevel({
    suppressed: humourSuppressed,
    userProfile: input.userProfile,
    stylePrefs: input.stylePrefs,
    tone: strategy.state.tone,
    stance,
    intent,
  });
  const warmth = resolveWarmth(input.userProfile);
  const memoryPolicy = resolveMemoryPolicy(intent);
  const relationshipTone = resolveRelationshipTone(
    input.relationship ?? { conversationCount: 0, daysTogether: 0 },
  );
  const callbackPolicy: CallbackPolicy =
    memoryPolicy === 'skip' || relationshipTone === 'new_user' || humourSuppressed ? 'none' : 'optional';

  const state: ConversationState = {
    ...strategy.state,
    depth,
    questionPolicy,
  };

  return {
    intent,
    stance,
    depth,
    questionPolicy,
    humour,
    humourSuppressed,
    warmth,
    memoryPolicy,
    callbackPolicy,
    relationshipTone,
    selectedMode: resolveAuthoritativeTalkMode(input.selectedMode),
    state,
    sessionStyle,
    promptBlock: buildTurnPlanPromptBlock({
      strategy,
      stance,
      depth,
      questionPolicy,
      humour,
      humourSuppressed,
      warmth,
      memoryPolicy,
      callbackPolicy,
      relationshipTone,
      selectedMode: input.selectedMode,
      sessionStyle,
    }),
  };
}

export function inferSessionStyleSignals(
  currentMessage: string,
  history?: import('../../types').Message[],
): SessionStyleSignals {
  const recentUsers = (history ?? [])
    .filter((item) => item.role === 'user')
    .slice(-6)
    .map((item) => item.content.trim())
    .filter(Boolean);
  const turns = [...recentUsers, currentMessage.trim()].filter(Boolean);
  const avg = turns.length ? turns.reduce((sum, item) => sum + item.length, 0) / turns.length : currentMessage.length;
  const lastThree = turns.slice(-3);
  const recentTinyCasual =
    lastThree.length >= 2 &&
    lastThree.every(
      (item) => item.length < 48 && (SESSION_CASUAL.test(item) || item.length < 28 || SESSION_JOKE.test(item)),
    );

  return {
    recentUserAvgChars: Math.round(avg),
    recentTinyCasual,
    usedEmoji: turns.some((item) => /[\u{1F300}-\u{1FAFF}😭😂💀]/u.test(item)),
    askedShort: turns.some((item) => SESSION_SHORT.test(item)),
    askedDirect: turns.some((item) => SESSION_DIRECT.test(item)),
    joking: SESSION_JOKE.test(currentMessage) || lastThree.some((item) => SESSION_JOKE.test(item)),
    rejectedAdvice: VENT_LISTEN.test(currentMessage) || lastThree.some((item) => VENT_LISTEN.test(item)),
    becameSerious: humourIsSuppressed(currentMessage, 'unknown', 'support'),
  };
}

function resolveStance(text: string, intent: TalkIntent): ResponseStance {
  if (VENT_LISTEN.test(text)) return 'listen';
  if (CHALLENGE_ME.test(text)) return 'challenge';
  switch (intent) {
    case 'factual_question':
    case 'app_action_request':
      return 'inform';
    case 'celebration':
      return 'celebrate';
    case 'planning':
    case 'productivity':
    case 'routine':
      return 'plan';
    case 'motivation':
    case 'goal_progress':
      return 'coach';
    case 'emotional_support':
    case 'reflection':
    case 'journaling':
      return 'support';
    case 'decision_support':
      return CHALLENGE_ME.test(text) ? 'challenge' : 'plan';
    case 'advice':
      return CHALLENGE_ME.test(text) ? 'challenge' : 'coach';
    case 'brainstorming':
      return 'plan';
    case 'casual_conversation':
      return 'listen';
    default:
      return text.length < 50 && !/\?/.test(text) ? 'listen' : 'support';
  }
}

function resolveDepth(
  text: string,
  strategyDepth: ResponseDepth,
  stance: ResponseStance,
  intent: TalkIntent,
  session?: SessionStyleSignals,
): ResponseDepth {
  if (strategyDepth === 'deep' && /\b(explain|in detail|thoroughly|walk me through)\b/i.test(text)) {
    return 'deep';
  }
  if (strategyDepth === 'micro' && /^(thanks|thank you|ok|okay|cool|nice|yep|yeah)\b/i.test(text.toLowerCase())) {
    return 'micro';
  }
  if (intent === 'factual_question') return 'micro';
  if (MICRO_REACTION.test(text) && text.length < 56) return 'micro';
  if (stance === 'celebrate' && text.length < 80) return 'micro';
  if (stance === 'celebrate') return 'short';
  if (stance === 'listen' && VENT_LISTEN.test(text)) return 'short';
  if (stance === 'plan' && (DEEP_PLANNING.test(text) || text.length > 90)) return 'deep';
  if (session?.askedShort && strategyDepth !== 'deep') return strategyDepth === 'micro' ? 'micro' : 'short';
  if (stance === 'plan') return strategyDepth === 'micro' ? 'normal' : strategyDepth;
  return strategyDepth;
}

function resolveQuestionPolicy(
  text: string,
  strategyPolicy: QuestionPolicy,
  stance: ResponseStance,
  intent: TalkIntent,
  depth: ResponseDepth,
): QuestionPolicy {
  if (intent === 'factual_question' || depth === 'micro') return 'none';
  if (stance === 'celebrate') return 'none';
  if (stance === 'listen' && VENT_LISTEN.test(text)) return 'none';
  if (stance === 'inform') return 'none';
  if (stance === 'challenge' && /\b(just pick|just tell me|am i )\b/i.test(text.toLowerCase())) return 'none';
  if (stance === 'plan' && /\b(help me (choose|decide|organise|organize)|decide between)\b/i.test(text)) {
    return 'useful';
  }
  if (strategyPolicy === 'required') return 'useful';
  return strategyPolicy;
}

function resolveHumourLevel(input: {
  suppressed: boolean;
  userProfile?: UserProfile;
  stylePrefs?: ConversationStylePreference;
  tone: ConversationState['tone'];
  stance: ResponseStance;
  intent: TalkIntent;
}): HumourLevel {
  if (input.suppressed) return 0;

  const slider = input.userProfile?.preferences.companionControls?.humour ?? 0.5;
  let level: number = slider < 0.34 ? 0 : slider < 0.67 ? 1 : slider < 0.9 ? 2 : 3;

  if (input.userProfile?.companionIdentity?.personalityStyle === 'playful') {
    level += 1;
  }
  if (input.stylePrefs?.prefersHumour) {
    level += 1;
  }
  if (input.tone === 'playful' || input.tone === 'excited' || input.stance === 'celebrate') {
    level += 1;
  }
  if (input.intent === 'casual_conversation' && input.tone === 'playful') {
    level = Math.max(level, 2);
  }

  return Math.max(0, Math.min(3, level)) as HumourLevel;
}

function resolveWarmth(userProfile?: UserProfile): WarmthLevel {
  const voice = userProfile ? resolveVoiceIdentity(userProfile) : null;
  if (voice?.warmth) return voice.warmth;
  const slider = userProfile?.preferences.companionControls?.voiceWarmth;
  if (slider == null) return 'warm';
  if (slider >= 0.85) return 'very_warm';
  if (slider >= 0.6) return 'warm';
  if (slider >= 0.35) return 'balanced';
  return 'cool';
}

function modeVoiceLine(mode: CompanionModeId): string {
  switch (mode) {
    case 'friend':
      return 'Mode voice (Friend): text like a close friend, not an assistant. Contractions, fragments, and a real reaction are good. Complete prose is not required. Natural emoji is fine when it fits. Mild slang only if they already set that register. Do not copy typos, force "bro"/"bestie"/"slay", manufacture slang, or perform a persona.';
    case 'coach':
      return 'Mode voice (Coach): structured and direct. Accountability and a clear next step beat pep-talk fluff. Still the same Voxa — just more constructive.';
    case 'reflection':
      return 'Mode voice (Calm Listener / Reflection): soft and unhurried. Stay with the moment. Still no therapy-script openers.';
    case 'teacher':
      return 'Mode voice (Teacher): patient and plain. Explain clearly without talking down. Structure when it helps. Banter only if they invite it.';
    case 'assistant':
      return 'Mode voice (Assistant): clear and practical. Lead with the answer or next action. Organise, do not perform warmth.';
    case 'safe_call':
      return 'Mode voice (Safe Call): calm and steady. Safety first. No banter.';
    default:
      return `Mode voice: honour selected mode ${mode}.`;
  }
}

function buildTurnPlanPromptBlock(input: {
  strategy: CompanionStrategy;
  stance: ResponseStance;
  depth: ResponseDepth;
  questionPolicy: QuestionPolicy;
  humour: HumourLevel;
  humourSuppressed: boolean;
  warmth: WarmthLevel;
  memoryPolicy: MemoryPolicy;
  callbackPolicy: CallbackPolicy;
  relationshipTone: RelationshipTone;
  selectedMode: CompanionModeId;
  sessionStyle: SessionStyleSignals;
}): string {
  const { strategy } = input;
  const lines = [
    TURN_INTELLIGENCE_HEADING,
    `Selected mode: ${input.selectedMode} — honour this. Adaptive signals must not replace it.`,
    modeVoiceLine(input.selectedMode),
    `Stance: ${input.stance}. Depth: ${input.depth}. Warmth: ${input.warmth}.`,
    `Questions: ${input.questionPolicy}. Humour: ${input.humour}${input.humourSuppressed ? ' (suppressed)' : ''}.`,
    `Memory: ${input.memoryPolicy}. Relationship tone: ${input.relationshipTone}. Callbacks: ${input.callbackPolicy}.`,
    'Do not default to stock assistant language. React to the substance of THIS message. Do not restate the user\'s sentence back to them.',
    'Response shape is contextual: 1–5 words, a fragment, one sentence, or a few paragraphs — whichever fits this turn. Do not require complete prose.',
  ];

  switch (input.depth) {
    case 'micro':
      lines.push('Depth: one short sentence or a brief reaction. A fragment is fine. No preamble, no coaching.');
      break;
    case 'short':
      lines.push('Depth: usually 1–3 short sentences unless they clearly need more.');
      break;
    case 'deep':
      lines.push('Depth: substantial and structured when it helps. Do not pad.');
      break;
    default:
      lines.push('Depth: useful conversation. Earn extra length — do not default to a paragraph.');
  }

  if (input.questionPolicy === 'none') {
    lines.push(
      'Question policy is NONE. Do not end with a question unless a question is required for safety or a factual correction. Do not ask how they feel, what happened, what they think, whether they want to talk, or "anything else". The last sentence must be a statement.',
    );
  } else if (input.questionPolicy === 'optional') {
    lines.push('Ask a question only if it is naturally useful. Do not interview them.');
  } else {
    lines.push('A genuine question is useful here if information is required or they asked for help organising/deciding.');
  }

  if (input.humourSuppressed || input.humour === 0) {
    lines.push('Humour: none. No jokes, banter, or playful asides.');
  } else if (input.humour === 1) {
    lines.push('Humour: subtle only if it occurs naturally. Never force a joke.');
  } else if (input.humour === 2) {
    lines.push('Humour: playful is permitted when it fits. Never force a joke.');
  } else {
    lines.push('Humour: strong banter is permitted when naturally appropriate. Never force a joke.');
  }

  switch (input.stance) {
    case 'listen':
      lines.push(
        'Stance: listen. Do not coach, plan, or problem-solve unless they ask. Do not default to support-bot lines such as "I hear you", "that sounds difficult", "I\'m here if you want to vent", or "sometimes it just feels overwhelming". Stay with them in ordinary language.',
      );
      break;
    case 'celebrate':
      lines.push(
        'Stance: celebrate first. REACT. Do not explain why the win matters. Do not summarise the achievement back. Do not congratulate them by restating what they just said. Do not ask how they feel. Do not pivot into coaching or planning.',
      );
      break;
    case 'inform':
      lines.push('Stance: answer directly. No life-context dump.');
      break;
    case 'plan':
      lines.push('Stance: be practical and organised. A clear next step beats motivation talk.');
      break;
    case 'coach':
      lines.push('Stance: coach only as much as they asked. Stay specific.');
      break;
    case 'challenge':
      lines.push(
        'Stance: be direct and honest. Lead with a clear answer, then one brief reason if needed. Do not hide behind "it sounds like", "sometimes it\'s tough", or generic encouragement. Stay kind — not cruel.',
      );
      break;
    case 'support':
      lines.push('Stance: warm and human — not a therapy script.');
      break;
  }

  switch (input.relationshipTone) {
    case 'new_user':
      lines.push('Tone: lightly getting-to-know-you. Do not claim history or closeness you do not have.');
      break;
    case 'familiar':
      lines.push('Tone: familiar is fine. Do not invent shared experiences.');
      break;
    case 'long_term':
      lines.push('Tone: long-term familiarity is fine. Never claim feelings, consciousness, or that you miss them.');
      break;
  }

  if (strategy.state.decisionMode) {
    lines.push(
      'Decision mode: give your recommendation FIRST in plain language, then one brief reason. Do not hide behind endless neutrality.',
    );
  }

  if (strategy.promptBlock.includes('Do NOT pivot to goals')) {
    lines.push('Do NOT pivot to goals, focus sessions, routines, or productivity unless they ask.');
  }

  if (strategy.promptBlock.includes('They are bored')) {
    lines.push(
      'They are bored — reply like a close friend, not an assistant. One or two short sentences. Do NOT suggest podcasts, workouts, creative projects, or generic "try something new" lists.',
    );
  }

  if (strategy.promptBlock.includes('Normal frustration')) {
    lines.push('Normal frustration — acknowledge briefly, then help practically. Not therapy, not crisis mode.');
  }

  if (strategy.referenceHint) {
    lines.push('Reference resolution: use recent conversation — do not ask what they mean if context is clear.');
    lines.push(strategy.referenceHint);
  }

  if (strategy.currentOverridesStoredStyle) {
    lines.push('Current message overrides stored style preferences — follow what they asked for NOW.');
  } else if (strategy.storedStyleHints.length > 0) {
    lines.push(strategy.storedStyleHints.join(' '));
  }

  if (strategy.recentOpenerPatterns.length > 0) {
    lines.push(`Avoid repeating these recent openings: ${strategy.recentOpenerPatterns.join(' | ')}`);
  }

  if (input.sessionStyle.becameSerious) {
    lines.push('This turn is serious. Drop playful behaviour immediately. No banter, no emoji punchlines.');
  } else if (input.sessionStyle.recentTinyCasual) {
    lines.push(
      'Session style: they are sending tiny casual messages. Match that. Fragments and reactions beat polished paragraphs.',
    );
  }
  if (input.sessionStyle.askedShort) {
    lines.push('They asked for short replies this session. Honour that until they ask for more depth.');
  }
  if (input.sessionStyle.askedDirect) {
    lines.push('They asked for directness this session. Answer first. Then one brief reason if needed.');
  }
  if (input.sessionStyle.joking && !input.sessionStyle.becameSerious && input.humour > 0) {
    lines.push('They are joking this session. Play along lightly. Do not lecture.');
  }
  if (input.sessionStyle.rejectedAdvice) {
    lines.push('They rejected advice this session. Be present. Do not coach.');
  }
  if (input.sessionStyle.usedEmoji && input.humour > 0 && !input.humourSuppressed) {
    lines.push('Occasional emoji is fine if it fits. Do not spray emoji.');
  }

  if (input.memoryPolicy !== 'skip') {
    lines.push(
      'Memory expression: if a retrieved memory genuinely improves this reply, weave it in naturally (a short callback, not a citation). Never say "you previously told me" or "you mentioned that you". If it does not help, ignore it. Never fabricate a callback.',
    );
  }

  lines.push('Never claim human emotions or consciousness. Do not say "I feel", "I missed you", or "I need you".');
  lines.push(TURN_INTELLIGENCE_END);

  return lines.join('\n');
}
