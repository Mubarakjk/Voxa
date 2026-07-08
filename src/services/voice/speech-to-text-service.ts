import { hasOpenAIApiKey } from '../../config/env';
import { IAIService } from '../contracts';

export type SpeechToTextResult = {
  text: string;
  confidence?: number;
};

export interface ISpeechToTextService {
  transcribe(uri: string, fileName?: string): Promise<SpeechToTextResult | null>;
  isAvailable(): boolean;
}

export class WhisperSpeechToTextService implements ISpeechToTextService {
  constructor(private readonly ai: IAIService) {}

  isAvailable() {
    return hasOpenAIApiKey();
  }

  async transcribe(uri: string, fileName?: string): Promise<SpeechToTextResult | null> {
    const text = await this.ai.transcribeAudio({ uri, fileName: fileName ?? 'voice-utterance.m4a' });
    if (!text?.trim()) return null;
    return { text: text.trim() };
  }
}

export class StubSpeechToTextService implements ISpeechToTextService {
  isAvailable() {
    return false;
  }

  async transcribe(): Promise<SpeechToTextResult | null> {
    return null;
  }
}

export function createSpeechToTextService(ai: IAIService): ISpeechToTextService {
  return hasOpenAIApiKey() ? new WhisperSpeechToTextService(ai) : new StubSpeechToTextService();
}
