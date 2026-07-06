import { CompanionModeId, Memory, MemoryCategory, MemoryMood, Message } from '../../types';
import {
  AnalyzeConversationInput,
  ExtractedMemoryCandidate,
  GenerateCheckInInput,
  GenerateReplyInput,
  GenerateReplyResult,
  IAIService,
} from '../contracts';
import { MEMORY_EXTRACTION_CATEGORIES } from '../../constants/memory-categories';
import { extractMemoriesLocally } from '../memory/local-memory-extractor';
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

  async extractMemoriesFromExchange(input: AnalyzeConversationInput): Promise<ExtractedMemoryCandidate[]> {
    try {
      const categories = MEMORY_EXTRACTION_CATEGORIES.join(', ');
      const raw = await this.completeChat(
        [
          {
            role: 'system',
            content: [
              'Extract durable long-term memories about the user from this chat exchange.',
              `Valid categories: ${categories}.`,
              'Return ONLY a JSON array (max 3 items). Each item:',
              '{ "category": string, "title": string, "content": string, "importance": 1-5, "tags": string[], "mood": "motivated"|"warm"|"joyful"|"calm"|"reflective"|"stressed"|"neutral" }',
              'Skip small talk, greetings, and transient feelings. Merge with existing memories mentally — prefer updates over duplicates.',
            ].join('\n'),
          },
          {
            role: 'user',
            content: JSON.stringify({
              userMessage: input.userMessage,
              voxaReply: input.voxaReply,
              mode: input.mode,
              existingTitles: input.existingMemories.slice(0, 12).map((item) => item.title),
            }),
          },
        ],
        { temperature: 0.2, maxTokens: 500 },
      );

      return parseExtractedMemories(raw, input.mode);
    } catch (error) {
      console.warn('[Voxa] OpenAI memory extraction failed, using local rules.', error);
      return extractMemoriesLocally({
        userMessage: input.userMessage,
        voxaReply: input.voxaReply,
        mode: input.mode,
        existingMemories: input.existingMemories,
      });
    }
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

const VALID_MOODS: MemoryMood[] = [
  'motivated',
  'warm',
  'joyful',
  'calm',
  'reflective',
  'stressed',
  'neutral',
];

function parseExtractedMemories(raw: string, mode: CompanionModeId): ExtractedMemoryCandidate[] {
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  const parsed = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>;
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item): ExtractedMemoryCandidate | null => {
      const category = item.category as MemoryCategory;
      if (!MEMORY_EXTRACTION_CATEGORIES.includes(category)) return null;

      const title = String(item.title ?? '').trim();
      const content = String(item.content ?? '').trim();
      if (!title || !content) return null;

      const importanceRaw = Number(item.importance);
      const importance = (
        importanceRaw >= 1 && importanceRaw <= 5 ? importanceRaw : 3
      ) as Memory['importance'];
      const mood = VALID_MOODS.includes(item.mood as MemoryMood)
        ? (item.mood as MemoryMood)
        : 'neutral';

      return {
        category,
        title,
        content,
        importance,
        tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
        mood,
        relatedMode: mode,
      };
    })
    .filter((item): item is ExtractedMemoryCandidate => item !== null)
    .slice(0, 3);
}
