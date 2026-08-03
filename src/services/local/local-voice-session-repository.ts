import { STORAGE_KEYS } from '../../constants/storage-keys';
import {
  CreateVoiceSessionInput,
  createId,
  nowIso,
  UpdateVoiceSessionInput,
  VoiceCallState,
  VoiceSession,
} from '../../types';
import { asArray } from '../../utils/as-array';
import { IStorageService, IVoiceSessionRepository } from '../contracts';

export class LocalVoiceSessionRepository implements IVoiceSessionRepository {
  constructor(private readonly storage: IStorageService) {}

  private async readAll(): Promise<VoiceSession[]> {
    return asArray(await this.storage.getItem<VoiceSession[]>(STORAGE_KEYS.voiceSessions));
  }

  private async writeAll(sessions: VoiceSession[]): Promise<void> {
    await this.storage.setItem(STORAGE_KEYS.voiceSessions, sessions);
  }

  async listSessions(userId: string): Promise<VoiceSession[]> {
    const sessions = await this.readAll();
    return sessions
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getActiveSession(userId: string): Promise<VoiceSession | null> {
    const sessions = await this.listSessions(userId);
    return sessions.find((item) => item.state === 'ringing' || item.state === 'active') ?? null;
  }

  async getSession(id: string): Promise<VoiceSession | null> {
    const sessions = await this.readAll();
    return sessions.find((item) => item.id === id) ?? null;
  }

  async createSession(input: CreateVoiceSessionInput): Promise<VoiceSession> {
    const timestamp = nowIso();
    const session: VoiceSession = {
      id: createId('voice'),
      userId: input.userId,
      conversationId: input.conversationId,
      mode: input.mode,
      state: 'ringing',
      isSafeCall: input.isSafeCall ?? false,
      durationSeconds: 0,
      transcriptMessageIds: [],
      checkInIntervalMinutes: input.checkInIntervalMinutes,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const sessions = await this.readAll();
    sessions.push(session);
    await this.writeAll(sessions);
    return session;
  }

  async updateSession(id: string, input: UpdateVoiceSessionInput): Promise<VoiceSession> {
    const sessions = await this.readAll();
    const index = sessions.findIndex((item) => item.id === id);
    if (index === -1) throw new Error(`Voice session not found: ${id}`);

    const updated: VoiceSession = {
      ...sessions[index],
      ...input,
      state: (input.state ?? sessions[index].state) as VoiceCallState,
      updatedAt: nowIso(),
    };
    sessions[index] = updated;
    await this.writeAll(sessions);
    return updated;
  }
}
