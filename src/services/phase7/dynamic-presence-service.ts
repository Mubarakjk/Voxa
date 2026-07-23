import { Memory } from '../../types';
import { DynamicPresenceLine } from '../../types/phase7-signature';

export function buildDynamicPresence(input: {
  memories: Memory[];
  goals: Array<{ title: string; status: string }>;
  daysAway: number;
  streakDays: number;
  recentConversationPreview?: string | null;
}): DynamicPresenceLine | null {
  if (input.daysAway >= 1 && input.memories[0]) {
    const m = input.memories[0];
    const daysSince = Math.floor((Date.now() - new Date(m.createdAt).getTime()) / 86400000);
    if (daysSince <= 2) {
      return {
        line: `I have been thinking about what you said about "${m.title.slice(0, 40)}".`,
        memoryId: m.id,
        confidence: 'high',
      };
    }
  }

  const rememberMoment = input.memories.find((m) => m.tags?.includes('remember-this'));
  if (rememberMoment) {
    return {
      line: `I remembered something that might help — from "${rememberMoment.title}".`,
      memoryId: rememberMoment.id,
      confidence: 'high',
    };
  }

  if (input.streakDays >= 7) {
    return {
      line: `You have been doing really well lately — ${input.streakDays} days of showing up.`,
      confidence: 'high',
    };
  }

  const activeGoal = input.goals.find((g) => g.status === 'active');
  if (activeGoal && input.recentConversationPreview?.toLowerCase().includes('startup')) {
    return {
      line: `I have got an idea for your startup — want to hear it?`,
      confidence: 'medium',
    };
  }

  if (activeGoal) {
    return {
      line: `Still tracking your goal: "${activeGoal.title}".`,
      confidence: 'medium',
    };
  }

  return null;
}
