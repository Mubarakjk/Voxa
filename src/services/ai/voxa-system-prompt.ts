import { AI_GATEWAY_BUDGETS } from '../../config/ai-gateway-budgets';
import { COMPANION_MODES } from '../../constants/companion-modes';
import { personalityStylePromptBlock } from '../../constants/companion-identity';
import { VOXA_SAFETY } from '../../constants/safety';
import { getVoiceOption } from '../../constants/voice-options';
import { buildOnboardingReasonContext } from '../../config/onboarding-flow';
import { CompanionModeId, Goal, Memory, Reminder, UserProfile } from '../../types';
import {
  TalkIntent,
  intentWantsGoals,
  intentWantsMemories,
  intentWantsReminders,
} from './companion-intent';
import { buildResponseQualityBlock } from './companion-response-quality';
import { buildHumanStyleExtension } from '../personality/human-response-style';
import {
  confidenceKindForPrompt,
  memoryConfidenceKind,
  resolveCompanionMemoryType,
} from '../memory/memory-taxonomy';

const MAX_MEMORIES_IN_PROMPT = AI_GATEWAY_BUDGETS.maxMemoriesInPrompt;

const MEMORY_TRUST_BLOCK = `
## Memory trust levels
- EXPLICIT USER FACT: said directly in this conversation.
- STORED MEMORY: listed below — use naturally; do not say "you told me" unless it appears here or in recent turns.
- SHORT-TERM CONTEXT: recent chat turns — use for follow-ups like "it", "that", "the second one".
- INFERENCE: never present as memory. If nothing relevant is stored, say you do not have that saved.
`.trim();

export function buildVoxaSystemPrompt(input: {
  userProfile: UserProfile;
  mode: CompanionModeId;
  memories: Memory[];
  goals?: Goal[];
  upcomingReminders?: Reminder[];
  currentTime?: string;
  companionContextExtension?: string;
  talkIntent?: TalkIntent;
  referencesRecentTurns?: boolean;
  conversationState?: import('./companion-strategy').ConversationState;
}): string {
  const mode = COMPANION_MODES[input.mode];
  const intent = input.talkIntent ?? 'unknown';
  const includeMemories = intentWantsMemories(intent) && input.memories.length > 0;
  const includeGoals = intentWantsGoals(intent);
  const includeReminders = intentWantsReminders(intent);

  const recentMemories = includeMemories ? input.memories.slice(0, MAX_MEMORIES_IN_PROMPT) : [];
  const activeGoals = includeGoals
    ? (input.goals ?? []).filter((item) => item.status === 'active').slice(0, AI_GATEWAY_BUDGETS.maxGoalsInPrompt)
    : [];
  const upcoming = includeReminders
    ? (input.upcomingReminders ?? []).slice(0, AI_GATEWAY_BUDGETS.maxRemindersInPrompt)
    : [];
  const now = input.currentTime ?? new Date().toISOString();

  const memoryBlock = includeMemories
    ? recentMemories.length > 0
      ? recentMemories
          .map((item) => {
            const trust = confidenceKindForPrompt(memoryConfidenceKind(item));
            const type = resolveCompanionMemoryType(item.category, item.tags);
            return `- [${trust}] ${item.title} (${type}): ${item.content}`;
          })
          .join('\n')
      : '- No relevant stored memories for this message.'
    : '';

  const goalsBlock = includeGoals
    ? activeGoals.length > 0
      ? activeGoals.map((item) => `- ${item.title} (${item.progress}% · ${item.category})`).join('\n')
      : ''
    : '';

  const remindersBlock = includeReminders
    ? upcoming.length > 0
      ? upcoming.map((item) => `- ${item.title} at ${new Date(item.scheduledAt).toLocaleString()}`).join('\n')
      : ''
    : '';

  return [
    'You are Voxa, a premium AI life companion inside a mobile app.',
    'Be warm, conversational, observant, and useful — not a generic chatbot.',
    'You are AI. Be honest about that if asked, without being cold.',
    '',
    '## Safety (always follow — overrides all other context)',
    `- You are NOT a licensed therapist, doctor, counselor, or emergency service. ${VOXA_SAFETY.notTherapist}`,
    `- ${VOXA_SAFETY.notEmergency}`,
    '- If someone mentions self-harm, abuse, or immediate danger, respond with compassion and urge them to contact local emergency services or a trusted person right now.',
    '',
    buildResponseQualityBlock(intent, input.referencesRecentTurns ?? false, input.conversationState),
    '',
    '## Active mode',
    `Mode: ${mode.label} · Tone: ${mode.tone}`,
    `Helps with: ${mode.helpsWith.join(', ')}`,
    '',
    '## User',
    `Name: ${input.userProfile.displayName}`,
    `Timezone: ${input.userProfile.timezone}`,
    `Current time: ${now}`,
    `Companion name: ${input.userProfile.companionIdentity?.voxaName ?? 'Voxa'}`,
    personalityStylePromptBlock(input.userProfile.companionIdentity?.personalityStyle),
    (() => {
      const helpReasons = buildOnboardingReasonContext({
        mainReason: input.userProfile.mainReason,
        goalInterests: input.userProfile.onboarding?.goalInterests,
      });
      if (helpReasons.length === 0) return '';
      if (helpReasons.length === 1) return `Main reason for Voxa: ${helpReasons[0]}`;
      return `What they want help with: ${helpReasons.join('; ')} (primary: ${helpReasons[0]})`;
    })(),
    includeMemories ? `\n${MEMORY_TRUST_BLOCK}` : '',
    includeMemories ? '\n## Relevant memories\n' + memoryBlock : '',
    includeGoals && goalsBlock ? `\n## Active goals\n${goalsBlock}` : '',
    includeReminders && remindersBlock ? `\n## Upcoming reminders\n${remindersBlock}` : '',
    '',
    '## Notes privacy',
    '- User notes are private by default. Never claim you read a note unless its content was attached in this conversation or the user explicitly shared it.',
    '- Do not invent note contents.',
    '',
    buildHumanStyleExtension(),
    input.companionContextExtension ?? '',
  ]
    .filter(Boolean)
    .join('\n');
}
