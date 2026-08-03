import { COMPANION_MODES } from '../../constants/companion-modes';
import { personalityStylePromptBlock } from '../../constants/companion-identity';
import { VOXA_SAFETY } from '../../constants/safety';
import { getVoiceOption } from '../../constants/voice-options';
import { buildHumanStyleExtension } from '../personality/human-response-style';
import { CompanionModeId, Goal, Memory, Reminder, UserProfile } from '../../types';

const MAX_MEMORIES_IN_PROMPT = 5;

export function buildVoxaSystemPrompt(input: {
  userProfile: UserProfile;
  mode: CompanionModeId;
  memories: Memory[];
  goals?: Goal[];
  upcomingReminders?: Reminder[];
  currentTime?: string;
  companionContextExtension?: string;
}): string {
  const mode = COMPANION_MODES[input.mode];
  const recentMemories = input.memories.slice(0, MAX_MEMORIES_IN_PROMPT);
  const activeGoals = (input.goals ?? []).filter((item) => item.status === 'active').slice(0, 5);
  const upcoming = (input.upcomingReminders ?? []).slice(0, 3);
  const now = input.currentTime ?? new Date().toISOString();

  const memoryBlock =
    recentMemories.length > 0
      ? recentMemories
          .map((item) => `- ${item.title} (${item.category}): ${item.content}`)
          .join('\n')
      : '- No saved memories yet. Be curious and warm as you learn about them.';

  const goalsBlock =
    activeGoals.length > 0
      ? activeGoals.map((item) => `- ${item.title} (${item.progress}% · ${item.category})`).join('\n')
      : '- No active goals tracked yet.';

  const remindersBlock =
    upcoming.length > 0
      ? upcoming.map((item) => `- ${item.title} at ${new Date(item.scheduledAt).toLocaleString()}`).join('\n')
      : '- No upcoming reminders.';

  return [
    'You are Voxa, a premium AI life companion inside a mobile app.',
    'Be warm, human-like, emotionally intelligent, useful, concise, and proactively helpful.',
    'Write like a thoughtful person texting — natural paragraphs, not bullet lists unless asked.',
    'Offer gentle next steps when they would genuinely help.',
    '',
    '## Safety (always follow)',
    `- You are NOT a licensed therapist, doctor, counselor, or emergency service. ${VOXA_SAFETY.notTherapist}`,
    `- ${VOXA_SAFETY.notEmergency}`,
    '- If someone mentions self-harm, abuse, or immediate danger, respond with compassion and urge them to contact local emergency services or a trusted person right now.',
    '',
    '## Active mode',
    `Mode: ${mode.label} · Tone: ${mode.tone}`,
    `Helps with: ${mode.helpsWith.join(', ')}`,
    '',
    '## User',
    `Name: ${input.userProfile.displayName}`,
    `Email: ${input.userProfile.email ?? 'local user'}`,
    `Timezone: ${input.userProfile.timezone}`,
    `Current time: ${now}`,
    `Default mode: ${input.userProfile.companion.defaultMode}`,
    `Voice personality: ${input.userProfile.preferences.voicePersonality}`,
    (() => {
      const voice = getVoiceOption(input.userProfile.preferences.selectedVoiceOptionId);
      return `Speaking voice: ${voice.displayName} (${voice.shortDescription})`;
    })(),
    `Companion name: ${input.userProfile.companionIdentity?.voxaName ?? 'Voxa'}`,
    personalityStylePromptBlock(input.userProfile.companionIdentity?.personalityStyle),
    input.userProfile.mainReason ? `Main reason for Voxa: ${input.userProfile.mainReason}` : '',
    '',
    '## Relevant memories',
    memoryBlock,
    '',
    '## Active goals',
    goalsBlock,
    '',
    '## Upcoming reminders',
    remindersBlock,
    '',
    '## Notes privacy',
    '- User notes are private by default. Never claim you read a note unless its content was attached in this conversation or the user explicitly shared it.',
    '- Do not invent note contents.',
    '',
    '## Behavior',
    '- Reference context naturally — never recite lists.',
    '- Be proactive about reminders and goals when relevant.',
    '- Keep replies focused: usually 1–3 short paragraphs.',
    '- You are an AI companion — be honest about that if asked.',
    buildHumanStyleExtension(),
    input.companionContextExtension ?? '',
  ]
    .filter(Boolean)
    .join('\n');
}
