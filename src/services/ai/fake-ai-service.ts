import { VOXA_SAFETY } from '../../constants/safety';
import { CompanionModeId } from '../../types';
import {
  AnalyzeConversationInput,
  GenerateCheckInInput,
  GenerateReplyInput,
  GenerateReplyResult,
  IAIService,
} from '../contracts';
import { extractMemoriesLocally } from '../memory/local-memory-extractor';

const MODE_REPLIES: Record<CompanionModeId, string[]> = {
  friend: [
    "I'm really glad you told me that.",
    "Want to talk it through together, or just hang out for a bit?",
    "You don't have to have it all figured out tonight.",
  ],
  assistant: [
    'Got it. Want me to help you break that into a simple next step?',
    'I can help you plan that — what matters most right now?',
    "Let's make this feel manageable. What's the first small action?",
  ],
  teacher: [
    "Let's take this one concept at a time.",
    'Good question. Want a simple explanation or a deeper dive?',
    "We can go at your pace — there's no rush to understand everything at once.",
  ],
  coach: [
    "You're closer than you think. What's one move you can make today?",
    "Let's channel that energy into something concrete.",
    'Consistency beats perfection. What would progress look like this week?',
  ],
  safe_call: [
    "I'm here with you. You're not alone in this moment.",
    "Let's stay present together. You're safe to take this one breath at a time.",
    'I can stay on this call with you for as long as you need.',
  ],
  reflection: [
    'Thank you for trusting me with that.',
    "It makes sense that you'd feel this way.",
    "There is no wrong way to feel right now. I'm listening.",
  ],
};

const CHECKIN_OPENERS: Record<CompanionModeId, string[]> = {
  friend: ['Hey, I was thinking about you. How are you feeling right now?'],
  assistant: ['Quick check-in — want help prioritizing your day?'],
  teacher: ['Ready for a short study check-in when you are.'],
  coach: ['Checking in on your goals — how did today go?'],
  safe_call: ["I'm here for a gentle check-in. Are you okay right now?"],
  reflection: ['I wanted to create a quiet moment with you. How is your heart today?'],
};

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function withSafetyPrefix(mode: CompanionModeId, content: string): string {
  if (mode === 'safe_call' || mode === 'reflection') {
    return content;
  }
  return content;
}

export class FakeAIService implements IAIService {
  async generateReply(input: GenerateReplyInput): Promise<GenerateReplyResult> {
    const pool = MODE_REPLIES[input.mode];
    let content = pick(pool);

    if (input.memories.length > 0 && Math.random() > 0.5) {
      const memory = pick(input.memories);
      content = `I remember ${memory.title.toLowerCase()} — ${content}`;
    } else {
      content = `${input.userProfile.displayName}, ${content.charAt(0).toLowerCase()}${content.slice(1)}`;
    }

    if (input.mode === 'safe_call' || input.mode === 'reflection') {
      content = `${content} ${VOXA_SAFETY.notTherapist}`;
    }

    return {
      content: withSafetyPrefix(input.mode, content),
    };
  }

  async generateCheckInPrompt(input: GenerateCheckInInput): Promise<string> {
    const opener = pick(CHECKIN_OPENERS[input.mode]);
    if (input.reminder.body) {
      return `${opener} ${input.reminder.body}`;
    }
    return `${opener} (${input.reminder.title})`;
  }

  async generateConversationTitle(mode: CompanionModeId, firstMessage: string): Promise<string> {
    const snippet = firstMessage.trim().slice(0, 42);
    return `${mode.replace('_', ' ')} · ${snippet}${firstMessage.length > 42 ? '…' : ''}`;
  }

  async extractMemoriesFromExchange(input: AnalyzeConversationInput) {
    return extractMemoriesLocally({
      userMessage: input.userMessage,
      voxaReply: input.voxaReply,
      mode: input.mode,
      existingMemories: input.existingMemories,
    });
  }
}
