import {
  AnalyzeConversationInput,
  ExtractedMemoryCandidate,
  GenerateCheckInInput,
  GenerateReplyInput,
  GenerateReplyResult,
  IAIService,
} from '../contracts';
import { CompanionModeId } from '../../types';

/**
 * Tries a primary AI provider first, then falls back on any failure.
 */
export class FallbackAIService implements IAIService {
  constructor(
    private readonly primary: IAIService,
    private readonly fallback: IAIService,
  ) {}

  async generateReply(input: GenerateReplyInput): Promise<GenerateReplyResult> {
    try {
      return await this.primary.generateReply(input);
    } catch (error) {
      console.warn('[Voxa] Primary AI failed, using fallback.', error);
      return this.fallback.generateReply(input);
    }
  }

  async generateCheckInPrompt(input: GenerateCheckInInput): Promise<string> {
    try {
      return await this.primary.generateCheckInPrompt(input);
    } catch (error) {
      console.warn('[Voxa] Primary AI check-in failed, using fallback.', error);
      return this.fallback.generateCheckInPrompt(input);
    }
  }

  async generateConversationTitle(mode: CompanionModeId, firstMessage: string): Promise<string> {
    try {
      return await this.primary.generateConversationTitle(mode, firstMessage);
    } catch (error) {
      console.warn('[Voxa] Primary AI title failed, using fallback.', error);
      return this.fallback.generateConversationTitle(mode, firstMessage);
    }
  }

  async extractMemoriesFromExchange(input: AnalyzeConversationInput): Promise<ExtractedMemoryCandidate[]> {
    try {
      return await this.primary.extractMemoriesFromExchange(input);
    } catch (error) {
      console.warn('[Voxa] Primary AI memory extraction failed, using fallback.', error);
      return this.fallback.extractMemoriesFromExchange(input);
    }
  }
}
