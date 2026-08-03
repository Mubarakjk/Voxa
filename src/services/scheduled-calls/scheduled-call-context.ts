import {
  CompanionCallTone,
  SCHEDULED_CALL_REASON_LABELS,
  ScheduledCallReason,
  ScheduledCompanionCall,
} from '../../types/scheduled-companion-call';
import { getVoxaDisplayName } from '../../utils/companion-display';
import { UserProfile } from '../../types';

/**
 * Concise system context for a scheduled companion call.
 * Do not inject the full memory database.
 */
export function buildScheduledCallInstructions(input: {
  profile: UserProfile | null;
  call: ScheduledCompanionCall;
  topGoalTitle?: string | null;
  routineLabel?: string | null;
}): string {
  try {
    const profile = input.profile;
    const userName = profile?.displayName?.trim() || 'friend';
    const companionName = getVoxaDisplayName(profile);
    const reason = reasonPhrase(input.call.reason, input.call.customReason);
    const tone = toneGuidance(input.call.tone);

    const lines = [
      `You are calling ${userName} for their scheduled ${reason}.`,
      `Your companion name is ${companionName}.`,
      tone,
      'Respond naturally. Avoid guilt, pressure, or manipulative streak language.',
      'Do not claim this is a real telephone call.',
      'Do not promise medical, emergency, or crisis services.',
    ];

    if (input.topGoalTitle) {
      lines.push(`Relevant goal: ${input.topGoalTitle}.`);
    }
    if (input.routineLabel) {
      lines.push(`Relevant routine: ${input.routineLabel}.`);
    }
    if (input.call.callContext?.trim()) {
      lines.push(`User-provided context: ${input.call.callContext.trim().slice(0, 280)}`);
    }

    return lines.join('\n');
  } catch {
    return '';
  }
}

export function reasonPhrase(reason: ScheduledCallReason, customReason?: string): string {
  if (reason === 'custom' && customReason?.trim()) return customReason.trim();
  return SCHEDULED_CALL_REASON_LABELS[reason] ?? 'check-in';
}

function toneGuidance(tone: CompanionCallTone): string {
  switch (tone) {
    case 'motivating':
      return 'Preferred tone: motivating and energising, without pressure.';
    case 'calm':
      return 'Preferred tone: calm, gentle, and unhurried.';
    case 'coach':
      return 'Preferred tone: supportive coach — clear questions, practical next steps.';
    case 'warm':
    default:
      return 'Preferred tone: warm and friendly.';
  }
}
