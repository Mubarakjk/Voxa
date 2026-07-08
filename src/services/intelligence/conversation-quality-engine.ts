import { ConversationQualityState } from '../../types/companion-intelligence';

const MAX_TRACK = 12;

export class ConversationQualityEngine {
  recordExchange(
    state: ConversationQualityState,
    userMessage: string,
    voxaReply: string,
  ): ConversationQualityState {
    const questions = extractQuestions(voxaReply);
    const greetings = extractGreetings(voxaReply);
    const topics = extractSuggestedTopics(voxaReply, userMessage);

    return {
      updatedAt: new Date().toISOString(),
      recentQuestions: unique([...questions, ...state.recentQuestions]).slice(0, MAX_TRACK),
      recentGreetings: unique([...greetings, ...state.recentGreetings]).slice(0, MAX_TRACK),
      recentSuggestedTopics: unique([...topics, ...state.recentSuggestedTopics]).slice(0, MAX_TRACK),
    };
  }

  pickVariedOpener(state: ConversationQualityState, candidates: string[]): string {
    const unused = candidates.filter(
      (c) => !state.recentGreetings.some((g) => similarity(g, c) > 0.6),
    );
    return unused[0] ?? candidates[Math.floor(Math.random() * candidates.length)] ?? candidates[0];
  }
}

function extractQuestions(text: string): string[] {
  return text
    .split(/(?<=[.?!])\s+/)
    .filter((s) => s.includes('?'))
    .map((s) => s.trim().slice(0, 120))
    .slice(0, 3);
}

function extractGreetings(text: string): string[] {
  const first = text.split(/[.!?]/)[0]?.trim() ?? '';
  if (first.length < 80 && /^(hey|hi|hello|good morning|good evening|good afternoon)/i.test(first)) {
    return [first];
  }
  return [];
}

function extractSuggestedTopics(voxaReply: string, userMessage: string): string[] {
  const topics: string[] = [];
  const combined = `${userMessage} ${voxaReply}`.toLowerCase();
  for (const keyword of ['work', 'study', 'fitness', 'sleep', 'family', 'goals', 'weekend', 'music']) {
    if (combined.includes(keyword)) topics.push(keyword);
  }
  return topics.slice(0, 3);
}

function unique(items: string[]) {
  return [...new Set(items)];
}

function similarity(a: string, b: string) {
  const aw = new Set(a.toLowerCase().split(/\s+/));
  const bw = b.toLowerCase().split(/\s+/);
  let overlap = 0;
  for (const w of bw) if (aw.has(w)) overlap += 1;
  return overlap / Math.max(bw.length, 1);
}

export const conversationQualityEngine = new ConversationQualityEngine();
