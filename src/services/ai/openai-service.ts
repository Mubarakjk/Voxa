import { CompanionModeId, Message } from '../../types';
import {
  GenerateCheckInInput,
  GenerateReplyInput,
  GenerateReplyResult,
  IAIService,
} from '../contracts';
import { buildVoxaSystemPrompt } from './voxa-system-prompt';

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';
const MAX_HISTORY_MESSAGES = 20;

type OpenAIChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type OpenAIServiceOptions = {
  apiKey: string;
  model?: string;
};

export class OpenAIService implements IAIService {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(options: OpenAIServiceOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? DEFAULT_MODEL;
  }

  async generateReply(input: GenerateReplyInput): Promise<GenerateReplyResult> {
    const systemPrompt = buildVoxaSystemPrompt({
      userProfile: input.userProfile,
      mode: input.mode,
      memories: input.memories,
    });

    const messages: OpenAIChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...mapConversationHistory(input.conversationHistory),
    ];

    const content = await this.completeChat(messages, {
      temperature: 0.8,
      maxTokens: 500,
    });

    return {
      content,
      suggestedMemory: input.userProfile.preferences.memoryEnabled
        ? inferMemorySuggestion(input)
        : undefined,
    };
  }

  async generateCheckInPrompt(input: GenerateCheckInInput): Promise<string> {
    const systemPrompt = buildVoxaSystemPrompt({
      userProfile: input.userProfile,
      mode: input.mode,
      memories: input.memories,
    });

    const userPrompt = input.reminder.body
      ? `Write a short, warm check-in opener for the reminder "${input.reminder.title}". Context: ${input.reminder.body}`
      : `Write a short, warm check-in opener for the reminder "${input.reminder.title}".`;

    return this.completeChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.7, maxTokens: 120 },
    );
  }

  async generateConversationTitle(mode: CompanionModeId, firstMessage: string): Promise<string> {
    const snippet = firstMessage.trim().slice(0, 42);
    const content = await this.completeChat(
      [
        {
          role: 'system',
          content:
            'Generate a short conversation title (max 6 words). Return only the title, no quotes.',
        },
        {
          role: 'user',
          content: `Mode: ${mode}. First message: ${firstMessage}`,
        },
      ],
      { temperature: 0.5, maxTokens: 24 },
    );

    return content || `${mode.replace('_', ' ')} · ${snippet}${firstMessage.length > 42 ? '…' : ''}`;
  }

  private async completeChat(
    messages: OpenAIChatMessage[],
    options: { temperature: number; maxTokens: number },
  ): Promise<string> {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI request failed (${response.status}): ${errorBody}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('OpenAI returned an empty response.');
    }

    return content;
  }
}

function mapConversationHistory(history: Message[]): OpenAIChatMessage[] {
  return history
    .filter((item) => item.role !== 'system')
    .slice(-MAX_HISTORY_MESSAGES)
    .map((item) => ({
      role: item.role === 'user' ? 'user' : 'assistant',
      content: item.content,
    }));
}

function inferMemorySuggestion(input: GenerateReplyInput): GenerateReplyResult['suggestedMemory'] {
  const text = input.userMessage.toLowerCase();
  if (text.includes('goal') || text.includes('want to') || text.includes('i hope')) {
    return {
      category: 'goals',
      title: 'Goal mentioned in chat',
      content: input.userMessage,
      mood: 'motivated',
      relatedMode: input.mode,
    };
  }
  return undefined;
}
