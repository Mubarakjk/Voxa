import { Goal, Memory, UserProfile } from '../../types';
import { RoutineBlock } from '../../types/routine';
import { ProactiveTemplateCandidate } from '../../types/proactive-check-in';
import { RoutineCoachService } from '../routine/routine-coach-service';
import {
  ProactiveTemplateContext,
  proactiveCheckInTemplateProviders,
  pickTopGoal,
  pickTopMemory,
} from './templates';

export type BuildProactiveMessageInput = {
  profile: UserProfile;
  goals: Goal[];
  memories: Memory[];
  routineBlocks: RoutineBlock[];
  missedRoutine?: RoutineBlock;
  hoursSinceLastMessage: number;
  usedMessages: Set<string>;
  now?: Date;
};

export class ProactiveCheckInMessageBuilder {
  build(input: BuildProactiveMessageInput): ProactiveTemplateCandidate {
    const now = input.now ?? new Date();
    const context: ProactiveTemplateContext = {
      displayName: input.profile.displayName,
      now,
      hoursSinceLastMessage: input.hoursSinceLastMessage,
      goals: input.goals,
      memories: input.memories,
      routineBlocks: input.routineBlocks,
      missedRoutine: input.missedRoutine,
      topGoal: pickTopGoal(input.goals),
      topMemory: pickTopMemory(input.memories),
    };

    const candidates = proactiveCheckInTemplateProviders
      .flatMap((provider) => provider.buildCandidates(context))
      .filter((candidate) => !input.usedMessages.has(candidate.message.trim().toLowerCase()))
      .sort((a, b) => b.priority - a.priority);

    if (candidates.length > 0) {
      return candidates[0];
    }

    const fallbackPool = proactiveCheckInTemplateProviders
      .flatMap((provider) => provider.buildCandidates(context))
      .sort((a, b) => b.priority - a.priority);

    const leastRecent = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
    return (
      leastRecent ?? {
        id: 'fallback_unique',
        message: `Hey ${input.profile.displayName}, I'm here whenever you want to talk.`,
        kind: 'random',
        priority: 1,
      }
    );
  }
}

export async function loadRoutineContext(
  routineService: RoutineCoachService,
  userId: string,
  now = new Date(),
): Promise<{ blocks: RoutineBlock[]; missedRoutine?: RoutineBlock }> {
  const summary = await routineService.getTodaySchedule(userId, now);
  const blocks = summary.blocks.map((item) => item);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const missedRoutine = summary.blocks.find((block) => {
    const [hour, minute] = block.time.split(':').map(Number);
    const blockMinutes = hour * 60 + minute;
    return blockMinutes < nowMinutes && block.completion?.status !== 'completed';
  });
  return { blocks, missedRoutine };
}

export const proactiveCheckInMessageBuilder = new ProactiveCheckInMessageBuilder();
