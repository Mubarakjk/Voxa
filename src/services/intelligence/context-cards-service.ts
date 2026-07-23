import { Conversation, Goal, Memory } from '../../types';
import { ContextCard } from '../../types/phase4-intelligence';
import { TodayRoutineSummary } from '../../types/routine';
import { CompanionJournalEntry } from '../journal/companion-journal-service';
import { LifeOSData } from '../life-os/life-os-service';
import { isMemoryPinned } from '../../utils/memory-pinned';

export type BuildContextCardsInput = {
  goals: Goal[];
  memories: Memory[];
  routine?: TodayRoutineSummary | null;
  journal?: CompanionJournalEntry | null;
  lifeOS?: LifeOSData;
  recentConversations?: Conversation[];
  moodLabel?: string | null;
  limit?: number;
};

const EMOJI: Record<ContextCard['kind'], string> = {
  goal: '🎯',
  memory: '💭',
  routine: '🏋',
  journal: '📔',
  bucket_list: '✈️',
  vision_board: '🌟',
  future_self: '🪞',
  challenge: '🔥',
  conversation: '💬',
  mood: '❤️',
};

export class ContextCardsService {
  build(input: BuildContextCardsInput): ContextCard[] {
    const cards: ContextCard[] = [];
    const limit = input.limit ?? 6;

    for (const goal of input.goals.filter((g) => g.status === 'active').slice(0, 3)) {
      cards.push({
        id: `goal:${goal.id}`,
        kind: 'goal',
        emoji: goal.category === 'fitness' ? '🏋' : goal.category === 'study' ? '📚' : EMOJI.goal,
        label: goal.title,
        prompt: `Let's check in on my goal: ${goal.title}`,
        sourceId: goal.id,
        weight: 0.7 + goal.progress / 200,
      });
    }

    if (input.routine && input.routine.streakDays >= 2) {
      cards.push({
        id: 'routine:streak',
        kind: 'routine',
        emoji: EMOJI.routine,
        label: `${input.routine.streakDays}-day routine streak`,
        prompt: `I've kept my routine going for ${input.routine.streakDays} days — let's talk about it`,
        weight: 0.75,
      });
    }

    if (input.routine?.nextBlock) {
      cards.push({
        id: `routine:${input.routine.nextBlock.id}`,
        kind: 'routine',
        emoji: EMOJI.routine,
        label: input.routine.nextBlock.title,
        prompt: `Help me with ${input.routine.nextBlock.title}`,
        sourceId: input.routine.nextBlock.id,
        weight: 0.8,
      });
    }

    const pinned = input.memories.filter((m) => isMemoryPinned(m)).slice(0, 2);
    const meaningful = input.memories
      .filter((m) => (m.emotionalSignificance ?? m.importance) >= 4)
      .slice(0, 2);
    for (const memory of [...pinned, ...meaningful].slice(0, 3)) {
      cards.push({
        id: `memory:${memory.id}`,
        kind: 'memory',
        emoji: EMOJI.memory,
        label: memory.title,
        prompt: `Remember when we talked about ${memory.title.toLowerCase()}?`,
        sourceId: memory.id,
        weight: isMemoryPinned(memory) ? 0.95 : 0.65,
      });
    }

    for (const item of input.lifeOS?.bucketList.slice(0, 2) ?? []) {
      cards.push({
        id: `bucket:${item.id}`,
        kind: 'bucket_list',
        emoji: item.emoji ?? EMOJI.bucket_list,
        label: item.title,
        prompt: `Let's dream about ${item.title}`,
        sourceId: item.id,
        weight: 0.7,
      });
    }

    for (const item of input.lifeOS?.visionBoard.slice(0, 2) ?? []) {
      cards.push({
        id: `vision:${item.id}`,
        kind: 'vision_board',
        emoji: item.emoji ?? EMOJI.vision_board,
        label: item.title,
        prompt: `I want to move closer to ${item.title}`,
        sourceId: item.id,
        weight: 0.72,
      });
    }

    for (const item of input.lifeOS?.futureSelf.slice(0, 1) ?? []) {
      cards.push({
        id: `future:${item.id}`,
        kind: 'future_self',
        emoji: EMOJI.future_self,
        label: item.title,
        prompt: `Let's talk about my future self: ${item.title}`,
        sourceId: item.id,
        weight: 0.68,
      });
    }

    for (const item of input.lifeOS?.challenges.slice(0, 1) ?? []) {
      cards.push({
        id: `challenge:${item.id}`,
        kind: 'challenge',
        emoji: EMOJI.challenge,
        label: item.title,
        prompt: `Check in on my challenge: ${item.title}`,
        sourceId: item.id,
        weight: 0.74,
      });
    }

    if (input.journal?.body?.trim()) {
      cards.push({
        id: `journal:${input.journal.savedAt}`,
        kind: 'journal',
        emoji: EMOJI.journal,
        label: "Today's journal",
        prompt: 'I want to reflect on what I wrote today',
        weight: 0.66,
      });
    }

    const recent = input.recentConversations?.[0];
    if (recent?.summary) {
      cards.push({
        id: `conversation:${recent.id}`,
        kind: 'conversation',
        emoji: EMOJI.conversation,
        label: 'Continue last chat',
        prompt: 'Continue where we left off',
        sourceId: recent.id,
        weight: 0.6,
      });
    }

    if (input.moodLabel && /stress|low|sad|anxious/i.test(input.moodLabel)) {
      cards.push({
        id: 'mood:checkin',
        kind: 'mood',
        emoji: EMOJI.mood,
        label: 'Confidence',
        prompt: 'I could use a gentle check-in',
        weight: 0.7,
      });
    }

    return [...cards]
      .sort((a, b) => b.weight - a.weight)
      .filter((card, index, arr) => arr.findIndex((c) => c.label === card.label) === index)
      .slice(0, limit);
  }
}

export const contextCardsService = new ContextCardsService();
