import { createUuid } from '../../types';
import {
  AIActionIntentResult,
  AnalyzeConversationInput,
  ExtractedMemoryCandidate,
  GenerateCheckInInput,
  GenerateReplyInput,
  GenerateReplyResult,
  IAIService,
  SummarizeConversationInput,
  UnderstandActionIntentInput,
} from '../contracts';
import { CompanionModeId } from '../../types';
import { TalkAIError } from './talk-ai-errors';
import { invokeAiGatewayChatOrThrow } from './ai-gateway-client';
import { buildGatewayChatMessagesWithDiagnostics } from './chat-message-builder';
import { FakeAIService } from './fake-ai-service';

const DEFAULT_MODEL = 'gpt-4o-mini';
const MAX_OUTPUT_TOKENS = 500;

/**
 * Routes core Talk completions through the Supabase ai-gateway edge function.
 * Non-talk IAIService methods delegate to offline/local fallbacks.
 */
export class GatewayAIService implements IAIService {
  private readonly offline = new FakeAIService();
  private readonly model: string;

  constructor(options?: { model?: string }) {
    this.model = options?.model ?? DEFAULT_MODEL;
  }

  async generateReply(input: GenerateReplyInput): Promise<GenerateReplyResult> {
    const content = await this.completeTalk(input);
    return { content };
  }

  async generateReplyStream(
    input: GenerateReplyInput,
    onChunk: (chunk: string) => void,
  ): Promise<GenerateReplyResult> {
    const content = await this.completeTalk(input);
    onChunk(content);
    return { content };
  }

  generateCheckInPrompt(input: GenerateCheckInInput): Promise<string> {
    return this.offline.generateCheckInPrompt(input);
  }

  generateConversationTitle(mode: CompanionModeId, firstMessage: string): Promise<string> {
    return this.offline.generateConversationTitle(mode, firstMessage);
  }

  extractMemoriesFromExchange(input: AnalyzeConversationInput): Promise<ExtractedMemoryCandidate[]> {
    return this.offline.extractMemoriesFromExchange(input);
  }

  understandActionIntent(input: UnderstandActionIntentInput): Promise<AIActionIntentResult> {
    return (this.offline as IAIService).understandActionIntent(input);
  }

  summarizeConversation(input: SummarizeConversationInput): Promise<string> {
    return this.offline.summarizeConversation(input);
  }

  transcribeAudio(input: { uri: string; fileName?: string }): Promise<string | null> {
    return (this.offline as IAIService).transcribeAudio(input);
  }

  analyzeImage(input: { uri: string; mimeType?: string }): Promise<string | null> {
    return (this.offline as IAIService).analyzeImage(input);
  }

  private async completeTalk(input: GenerateReplyInput): Promise<string> {
    const { messages } = buildGatewayChatMessagesWithDiagnostics(input);
    let idempotencyKey = createUuid();

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const content = await invokeAiGatewayChatOrThrow({
          messages,
          model: this.model,
          maxTokens: MAX_OUTPUT_TOKENS,
          metric: 'ai_messages',
          amount: 1,
          idempotencyKey,
        });

        const trimmed = content.trim();
        if (!trimmed) {
          throw new Error('AI gateway returned an empty response.');
        }
        return trimmed;
      } catch (err) {
        if (err instanceof TalkAIError && err.code === 'duplicate' && attempt === 0) {
          idempotencyKey = createUuid();
          continue;
        }
        throw err;
      }
    }

    throw new Error('AI gateway request failed.');
  }
}
