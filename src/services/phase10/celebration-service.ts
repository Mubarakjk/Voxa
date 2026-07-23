import { AccessibilityInfo } from 'react-native';

import { STORAGE_KEYS } from '../../constants/storage-keys';
import { EntityId, nowIso } from '../../types';
import { CelebrationPayload, LevelUpEvent } from '../../types/phase10-play';
import { IStorageService } from '../contracts';

const COOLDOWN_MS = 2500;
let lastShownAt = 0;
let reduceMotion = false;

void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
  reduceMotion = v;
});
AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
  reduceMotion = v;
});

type Listener = (payload: CelebrationPayload) => void;
const listeners = new Set<Listener>();

export function subscribeCelebrations(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitCelebration(payload: CelebrationPayload) {
  for (const l of listeners) l(payload);
}

export class CelebrationService {
  constructor(private readonly storage: IStorageService) {}

  async shouldCelebrate(userId: EntityId, eventKey: string): Promise<boolean> {
    const map = (await this.storage.getItem<Record<string, string[]>>(STORAGE_KEYS.playCelebrationsShown)) ?? {};
    const shown = map[userId] ?? [];
    return !shown.includes(eventKey);
  }

  async markCelebrated(userId: EntityId, eventKey: string): Promise<void> {
    const map = (await this.storage.getItem<Record<string, string[]>>(STORAGE_KEYS.playCelebrationsShown)) ?? {};
    const shown = map[userId] ?? [];
    if (!shown.includes(eventKey)) {
      map[userId] = [...shown, eventKey].slice(-200);
      await this.storage.setItem(STORAGE_KEYS.playCelebrationsShown, map);
    }
  }

  async showIfNew(userId: EntityId, payload: CelebrationPayload): Promise<boolean> {
    if (reduceMotion && payload.kind !== 'level_up' && payload.kind !== 'achievement') {
      await this.markCelebrated(userId, payload.eventKey);
      return false;
    }
    if (Date.now() - lastShownAt < COOLDOWN_MS) return false;
    const ok = await this.shouldCelebrate(userId, payload.eventKey);
    if (!ok) return false;
    await this.markCelebrated(userId, payload.eventKey);
    lastShownAt = Date.now();
    emitCelebration(payload);
    return true;
  }

  async getPendingLevelUp(userId: EntityId): Promise<LevelUpEvent | null> {
    const map = (await this.storage.getItem<Record<string, LevelUpEvent>>(STORAGE_KEYS.playLevelUpsShown)) ?? {};
    const event = map[userId];
    if (!event || event.shown) return null;
    return event;
  }

  async saveLevelUp(event: LevelUpEvent): Promise<void> {
    const map = (await this.storage.getItem<Record<string, LevelUpEvent>>(STORAGE_KEYS.playLevelUpsShown)) ?? {};
    map[event.userId] = event;
    await this.storage.setItem(STORAGE_KEYS.playLevelUpsShown, map);
  }

  async markLevelUpShown(userId: EntityId): Promise<void> {
    const map = (await this.storage.getItem<Record<string, LevelUpEvent>>(STORAGE_KEYS.playLevelUpsShown)) ?? {};
    if (!map[userId]) return;
    map[userId] = { ...map[userId], shown: true };
    await this.storage.setItem(STORAGE_KEYS.playLevelUpsShown, map);
  }

  async lastCelebrationKey(userId: EntityId): Promise<string | null> {
    const map = (await this.storage.getItem<Record<string, string[]>>(STORAGE_KEYS.playCelebrationsShown)) ?? {};
    const keys = map[userId] ?? [];
    return keys[keys.length - 1] ?? null;
  }
}

let instance: CelebrationService | null = null;

export function getCelebrationService(storage: IStorageService) {
  if (!instance) instance = new CelebrationService(storage);
  return instance;
}

export function buildLevelUpMessage(newLevel: number): string {
  if (newLevel >= 25) return 'You have built something rare — consistency at this level is extraordinary.';
  if (newLevel >= 10) return 'Double digits. Voxa sees how steadily you show up.';
  return 'Level up — small wins are stacking into momentum.';
}
