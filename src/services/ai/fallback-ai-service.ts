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

  async generateReplyStream(
    input: GenerateReplyInput,
    onChunk: (chunk: string) => void,
  ): Promise<GenerateReplyResult> {
    const primary = this.primary as IAIService & {
      generateReplyStream?: (input: GenerateReplyInput, onChunk: (chunk: string) => void) => Promise<GenerateReplyResult>;
    };
    if (typeof primary.generateReplyStream === 'function') {
      try {
        return await primary.generateReplyStream(input, onChunk);
      } catch (error) {
        console.warn('[Voxa] Primary AI stream failed, trying non-streaming OpenAI.', error);
        try {
          const result = await this.primary.generateReply(input);
          const tokens = result.content.split(/(\s+)/);
          for (const token of tokens) {
            onChunk(token);
            await new Promise((resolve) => setTimeout(resolve, 12));
          }
          return result;
        } catch (nonStreamError) {
          console.warn('[Voxa] Primary AI non-stream failed, using FakeAI.', nonStreamError);
        }
      }
    }
    const result = await this.fallback.generateReply(input);
    const tokens = result.content.split(/(\s+)/);
    for (const token of tokens) {
      onChunk(token);
      await new Promise((resolve) => setTimeout(resolve, 18));
    }
    return result;
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

  async understandActionIntent(input: UnderstandActionIntentInput): Promise<AIActionIntentResult> {
    try {
      return await this.primary.understandActionIntent(input);
    } catch {
      return this.fallback.understandActionIntent(input);
    }
  }

  async summarizeConversation(input: SummarizeConversationInput): Promise<string> {
    try {
      return await this.primary.summarizeConversation(input);
    } catch (error) {
      console.warn('[Voxa] Primary AI summary failed, using fallback.', error);
      return this.fallback.summarizeConversation(input);
    }
  }

  async transcribeAudio(input: { uri: string; fileName?: string }): Promise<string | null> {
    try {
      return await this.primary.transcribeAudio(input);
    } catch (error) {
      console.warn('[Voxa] Primary AI transcription failed, using fallback.', error);
      return this.fallback.transcribeAudio(input);
    }
  }

  async analyzeImage(input: { uri: string; mimeType?: string }): Promise<string | null> {
    try {
      return await this.primary.analyzeImage(input);
    } catch (error) {
      console.warn('[Voxa] Primary AI image analysis failed, using fallback.', error);
      return this.fallback.analyzeImage(input);
    }
  }
}
