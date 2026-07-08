import { STORAGE_KEYS } from '../../constants/storage-keys';
import { IStorageService } from '../contracts';
import { VoiceTranscriptEntry } from './voice-engine';

export type StoredVoiceTranscript = {
  sessionId: string;
  conversationId: string;
  userId: string;
  isSafeCall: boolean;
  entries: VoiceTranscriptEntry[];
  updatedAt: string;
};

export class VoiceTranscriptStore {
  constructor(private readonly storage: IStorageService) {}

  private indexKey(userId: string) {
    return `${STORAGE_KEYS.voiceTranscripts}:index:${userId}`;
  }

  private transcriptKey(sessionId: string) {
    return `${STORAGE_KEYS.voiceTranscripts}:${sessionId}`;
  }

  async getTranscript(sessionId: string): Promise<StoredVoiceTranscript | null> {
    return this.storage.getItem<StoredVoiceTranscript>(this.transcriptKey(sessionId));
  }

  async saveTranscript(transcript: StoredVoiceTranscript): Promise<StoredVoiceTranscript> {
    await this.storage.setItem(this.transcriptKey(transcript.sessionId), transcript);

    const index = (await this.storage.getItem<string[]>(this.indexKey(transcript.userId))) ?? [];
    if (!index.includes(transcript.sessionId)) {
      index.unshift(transcript.sessionId);
      await this.storage.setItem(this.indexKey(transcript.userId), index.slice(0, 100));
    }

    return transcript;
  }

  async appendEntry(input: {
    sessionId: string;
    conversationId: string;
    userId: string;
    isSafeCall: boolean;
    entry: VoiceTranscriptEntry;
  }): Promise<StoredVoiceTranscript> {
    const existing =
      (await this.getTranscript(input.sessionId)) ??
      ({
        sessionId: input.sessionId,
        conversationId: input.conversationId,
        userId: input.userId,
        isSafeCall: input.isSafeCall,
        entries: [],
        updatedAt: new Date().toISOString(),
      } satisfies StoredVoiceTranscript);

    const next: StoredVoiceTranscript = {
      ...existing,
      entries: [...existing.entries, input.entry],
      updatedAt: new Date().toISOString(),
    };
    return this.saveTranscript(next);
  }

  async listSessionIds(userId: string, limit = 20): Promise<string[]> {
    const index = (await this.storage.getItem<string[]>(this.indexKey(userId))) ?? [];
    return index.slice(0, limit);
  }

  async listTranscripts(userId: string, limit = 20): Promise<StoredVoiceTranscript[]> {
    const ids = await this.listSessionIds(userId, limit);
    const items = await Promise.all(ids.map((id) => this.getTranscript(id)));
    return items.filter((item): item is StoredVoiceTranscript => Boolean(item));
  }
}
