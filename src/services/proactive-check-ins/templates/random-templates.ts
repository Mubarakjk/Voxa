import { ProactiveTemplateCandidate } from '../../../types/proactive-check-in';
import { IProactiveCheckInTemplateProvider, ProactiveTemplateContext, timeOfDayLabel } from './template-types';

const RANDOM_TEMPLATES: Array<{ id: string; build: (ctx: ProactiveTemplateContext) => string }> = [
  {
    id: 'random_gentle_ping',
    build: (ctx) => `Hey ${ctx.displayName}, just checking in. How's your ${timeOfDayLabel(ctx.now)} going?`,
  },
  {
    id: 'random_quiet_day',
    build: (ctx) => `You've been quiet today. Everything alright, ${ctx.displayName}?`,
  },
  {
    id: 'random_no_pressure',
    build: () => `No pressure at all — I'm here whenever you feel like talking.`,
  },
  {
    id: 'random_thinking_of_you',
    build: (ctx) => `Thinking of you, ${ctx.displayName}. Want to share what's on your mind?`,
  },
  {
    id: 'random_small_moment',
    build: () => `Sometimes a small check-in helps. What's one thing on your mind right now?`,
  },
  {
    id: 'random_soft_return',
    build: (ctx) => `Hey ${ctx.displayName} — whenever you're ready, I'm around for a quick chat.`,
  },
  {
    id: 'random_pause',
    build: () => `Just wanted to say hi. How are you holding up today?`,
  },
  {
    id: 'random_open_door',
    build: (ctx) => `${ctx.displayName}, I'm here if today got busy and you need a minute to reset.`,
  },
];

export class RandomProactiveTemplateProvider implements IProactiveCheckInTemplateProvider {
  readonly providerKind = 'random' as const;

  buildCandidates(context: ProactiveTemplateContext): ProactiveTemplateCandidate[] {
    return RANDOM_TEMPLATES.map((template) => ({
      id: template.id,
      message: template.build(context),
      kind: 'random' as const,
      priority: 10,
    }));
  }
}

export const randomProactiveTemplateProvider = new RandomProactiveTemplateProvider();
