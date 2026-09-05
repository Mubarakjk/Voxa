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
import { FakeAIService } from './fake-ai-service';

const FAIL_SAFE_MESSAGE =
  'AI is unavailable in this build. Sign in with Supabase and configure the server AI gateway before using Talk.';

/**
 * Release builds without a configured gateway must not silently fall back to FakeAI or client OpenAI.
 */
export class FailSafeTalkAIService implements IAIService {
  private readonly offline = new FakeAIService();

  async generateReply(_input: GenerateReplyInput): Promise<GenerateReplyResult> {
    throw new Error(FAIL_SAFE_MESSAGE);
  }

  async generateReplyStream(
    _input: GenerateReplyInput,
    _onChunk: (chunk: string) => void,
  ): Promise<GenerateReplyResult> {
    throw new Error(FAIL_SAFE_MESSAGE);
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
}
