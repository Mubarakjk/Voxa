import { UserProfile, Goal, Memory } from '../../types';
import { getVoxaDisplayName } from '../../utils/companion-display';

/**
 * Minimal non-blocking context for Realtime calls.
 * Never throws — empty string on failure so the call can still start.
 */
export function buildRealtimeCallInstructions(input: {
  profile: UserProfile | null;
  topGoal?: Goal | null;
  memories?: Memory[];
  scheduledInstructions?: string;
}): string {
  try {
    const profile = input.profile;
    if (!profile) return input.scheduledInstructions?.trim() || '';

    const userName = profile.displayName?.trim() || 'friend';
    const voxaName = getVoxaDisplayName(profile);
    const style = profile.companionIdentity?.personalityStyle ?? 'warm';
    const lines: string[] = [];

    if (input.scheduledInstructions?.trim()) {
      lines.push(input.scheduledInstructions.trim());
      lines.push('');
    }

    lines.push(
      `The user's preferred name is ${userName}.`,
      `Your companion name is ${voxaName}.`,
      `Personality tone: ${style}. Keep replies concise and conversational.`,
    );

    if (input.topGoal?.title) {
      const progress =
        typeof input.topGoal.progress === 'number' ? ` (${Math.round(input.topGoal.progress)}% progress)` : '';
      lines.push(`Current top goal: ${input.topGoal.title}${progress}.`);
    }

    // Scheduled calls intentionally avoid dumping the full memory set.
    if (!input.scheduledInstructions?.trim()) {
      const memories = (input.memories ?? [])
        .filter((m) => m.content?.trim())
        .slice(0, 4)
        .map((m) => `- ${(m.title ? `${m.title}: ` : '')}${m.content}`.slice(0, 160));

      if (memories.length) {
        lines.push('High-priority memories (use lightly, do not recite unless relevant):');
        lines.push(...memories);
      }
    }

    return lines.join('\n');
  } catch {
    return '';
  }
}
