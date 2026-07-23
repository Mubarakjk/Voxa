import { ProactiveTemplateCandidate } from '../../../types/proactive-check-in';
import {
  IProactiveCheckInTemplateProvider,
  ProactiveTemplateContext,
  pickTopGoal,
  timeOfDayLabel,
} from './template-types';

export class ContextualProactiveTemplateProvider implements IProactiveCheckInTemplateProvider {
  readonly providerKind = 'contextual' as const;

  buildCandidates(context: ProactiveTemplateContext): ProactiveTemplateCandidate[] {
    const candidates: ProactiveTemplateCandidate[] = [];
    const goal = context.topGoal ?? pickTopGoal(context.goals);
    const tod = timeOfDayLabel(context.now);

    if (goal) {
      candidates.push({
        id: `context_goal_${goal.id.slice(0, 8)}`,
        message: `I remembered you wanted to work on "${goal.title}" today. How's that going?`,
        kind: 'goal',
        priority: 70,
      });
      candidates.push({
        id: `context_goal_nudge_${goal.id.slice(0, 8)}`,
        message: `Still thinking about "${goal.title}"? Even a tiny step counts.`,
        kind: 'goal',
        priority: 65,
      });
    }

    if (context.missedRoutine) {
      candidates.push({
        id: `context_missed_routine_${context.missedRoutine.id.slice(0, 8)}`,
        message: `You planned "${context.missedRoutine.title}" earlier — want to pick it up or adjust the plan?`,
        kind: 'routine',
        priority: 75,
      });
    }

    const upcomingRoutine = context.routineBlocks[0];
    if (upcomingRoutine) {
      candidates.push({
        id: `context_upcoming_routine_${upcomingRoutine.id.slice(0, 8)}`,
        message: `"${upcomingRoutine.title}" is on your routine today. Need a quick pep talk before you start?`,
        kind: 'routine',
        priority: 60,
      });
    }

    candidates.push({
      id: `context_time_${tod}`,
      message:
        tod === 'morning'
          ? `Good morning — how are you feeling about the day ahead?`
          : tod === 'afternoon'
            ? `Hey, just checking in. How's your afternoon going?`
            : tod === 'evening'
              ? `Evening check-in — how did today treat you?`
              : `Late night thoughts? I'm here if you want to talk.`,
      kind: 'contextual',
      priority: 40,
    });

    if (context.hoursSinceLastMessage >= 24) {
      candidates.push({
        id: 'context_long_absence',
        message: `It's been a little while. No guilt — just checking that you're okay.`,
        kind: 'contextual',
        priority: 55,
      });
    }

    return candidates;
  }
}

export const contextualProactiveTemplateProvider = new ContextualProactiveTemplateProvider();
