import { IAIService } from '../contracts';
import { GoalCategory } from '../../types';
import {
  ActionIntentParser,
  ParsedActionIntent,
  actionIntentParser,
} from './action-intent-parser';

export type ParseMessageContext = {
  ai?: IAIService;
  userProfile: import('../../types').UserProfile;
  mode: import('../../types').CompanionModeId;
  activeGoals?: import('../../types').Goal[];
  upcomingReminders?: import('../../types').Reminder[];
};

export function mapAIIntentToParsed(
  result: import('../contracts').AIActionIntentResult,
): ParsedActionIntent | null {
  if (result.action === 'none') return null;
  if (result.action === 'set_reminder') {
    return {
      action: 'set_reminder',
      title: result.title,
      scheduledAt: new Date(result.scheduledAt),
    };
  }
  return {
    action: 'create_goal',
    title: result.title,
    category: result.category as GoalCategory,
  };
}

/**
 * Rule-based first, optional OpenAI enhancement when rules miss.
 */
export async function parseMessageIntent(
  message: string,
  parser: ActionIntentParser,
  context?: ParseMessageContext,
): Promise<ParsedActionIntent | null> {
  const ruleMatch = parser.parse(message);
  if (ruleMatch) return ruleMatch;

  if (!context?.ai) return null;

  const aiResult = await context.ai.understandActionIntent({
    message,
    userProfile: context.userProfile,
    mode: context.mode,
    activeGoals: context.activeGoals,
    upcomingReminders: context.upcomingReminders,
    currentTime: new Date().toISOString(),
  });

  return mapAIIntentToParsed(aiResult);
}

export { actionIntentParser };
