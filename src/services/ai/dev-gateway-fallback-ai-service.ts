import { CompanionModeId } from '../../types';
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
import { isGatewayDeploymentError } from './talk-ai-errors';

/**
 * Development-only safety net: when Supabase is configured but ai-gateway is not deployed,
 * fall back to direct OpenAI instead of surfacing a raw edge-function error.
 * Preview/production never use this wrapper.
 */
export class DevGatewayFallbackAIService implements IAIService {
  constructor(
    private readonly gateway: IAIService,
    private readonly direct: IAIService,
  ) {}

  async generateReply(input: GenerateReplyInput): Promise<GenerateReplyResult> {
    try {
      return await this.gateway.generateReply(input);
    } catch (err) {
      if (isGatewayDeploymentError(err)) {
        return this.direct.generateReply(input);
      }
      throw err;
    }
  }

  async generateReplyStream(
    input: GenerateReplyInput,
    onChunk: (chunk: string) => void,
  ): Promise<GenerateReplyResult> {
    const gateway = this.gateway as IAIService & {
      generateReplyStream?: (
        input: GenerateReplyInput,
        onChunk: (chunk: string) => void,
      ) => Promise<GenerateReplyResult>;
    };
    const direct = this.direct as IAIService & {
      generateReplyStream?: (
        input: GenerateReplyInput,
        onChunk: (chunk: string) => void,
      ) => Promise<GenerateReplyResult>;
    };

    try {
      if (typeof gateway.generateReplyStream === 'function') {
        return await gateway.generateReplyStream(input, onChunk);
      }
      const result = await this.generateReply(input);
      const tokens = result.content.split(/(\s+)/);
      for (const token of tokens) {
        onChunk(token);
      }
      return result;
    } catch (err) {
      if (isGatewayDeploymentError(err)) {
        if (typeof direct.generateReplyStream === 'function') {
          return direct.generateReplyStream(input, onChunk);
        }
        const result = await this.direct.generateReply(input);
        const tokens = result.content.split(/(\s+)/);
        for (const token of tokens) {
          onChunk(token);
        }
        return result;
      }
      throw err;
    }
  }

  generateCheckInPrompt(input: GenerateCheckInInput): Promise<string> {
    return this.gateway.generateCheckInPrompt(input);
  }

  generateConversationTitle(mode: CompanionModeId, firstMessage: string): Promise<string> {
    return this.gateway.generateConversationTitle(mode, firstMessage);
  }

  extractMemoriesFromExchange(input: AnalyzeConversationInput): Promise<ExtractedMemoryCandidate[]> {
    return this.gateway.extractMemoriesFromExchange(input);
  }

  understandActionIntent(input: UnderstandActionIntentInput): Promise<AIActionIntentResult> {
    return this.gateway.understandActionIntent(input);
  }

  summarizeConversation(input: SummarizeConversationInput): Promise<string> {
    return this.gateway.summarizeConversation(input);
  }

  transcribeAudio(input: { uri: string; fileName?: string }): Promise<string | null> {
    return this.gateway.transcribeAudio(input);
  }

  analyzeImage(input: { uri: string; mimeType?: string }): Promise<string | null> {
    return this.gateway.analyzeImage(input);
  }
}
