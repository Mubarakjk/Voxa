import { createUuid, EntityId } from '../../types';
import { DailySurprise } from '../../types/phase10-play';
import { STORAGE_KEYS } from '../../constants/storage-keys';
import { IStorageService } from '../contracts';

const SURPRISES: Omit<DailySurprise, 'id' | 'shown'>[] = [
  { line: 'I wrote this for you.', kind: 'poem', actionPrompt: 'Share a short poem inspired by my recent goals — warm, not cheesy.' },
  { line: 'I found something interesting.', kind: 'fact', actionPrompt: 'Tell me one interesting fact connected to something I care about.' },
  { line: "I've got a challenge.", kind: 'challenge', actionPrompt: 'Give me one small challenge I can finish in ten minutes.' },
  { line: 'I noticed something.', kind: 'observation', actionPrompt: 'Share one gentle observation about my recent patterns — only from real context.' },
  { line: 'Want to play?', kind: 'game_invite', actionPrompt: 'Invite me to a quick game — would you rather or trivia.' },
];

function daySeed(date: string, userId: string): number {
  let h = 0;
  for (const c of `surprise:${date}:${userId}`) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export class DailySurpriseService {
  constructor(private readonly storage: IStorageService) {}

  async getToday(userId: EntityId): Promise<DailySurprise | null> {
    const map = (await this.storage.getItem<Record<string, DailySurprise>>(STORAGE_KEYS.dailySurprises)) ?? {};
    const today = new Date().toISOString().slice(0, 10);
    const key = `${userId}:${today}`;
    if (map[key]) return map[key];

    const seed = daySeed(today, userId);
    const template = SURPRISES[seed % SURPRISES.length];
    const surprise: DailySurprise = { ...template, id: createUuid(), shown: false };
    map[key] = surprise;
    await this.storage.setItem(STORAGE_KEYS.dailySurprises, map);
    return surprise;
  }

  async markShown(userId: EntityId): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const map = (await this.storage.getItem<Record<string, DailySurprise>>(STORAGE_KEYS.dailySurprises)) ?? {};
    const key = `${userId}:${today}`;
    if (!map[key]) return;
    map[key] = { ...map[key], shown: true };
    await this.storage.setItem(STORAGE_KEYS.dailySurprises, map);
  }
}

let instance: DailySurpriseService | null = null;

export function getDailySurpriseService(storage: IStorageService) {
  if (!instance) instance = new DailySurpriseService(storage);
  return instance;
}
