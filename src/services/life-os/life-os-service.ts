import { STORAGE_KEYS } from '../../constants/storage-keys';
import { IStorageService } from '../contracts';
import {
  BucketListItem,
  FutureSelfNote,
  LifeBookEntry,
  LifeChallenge,
  VisionBoardItem,
  createBucketListItem,
  createFutureSelfNote,
  createLifeBookEntry,
  createLifeChallenge,
  createVisionBoardItem,
} from '../../types/life-os';
import { EntityId, nowIso } from '../../types';

export type LifeOSData = {
  bucketList: BucketListItem[];
  visionBoard: VisionBoardItem[];
  futureSelf: FutureSelfNote[];
  lifeBook: LifeBookEntry[];
  challenges: LifeChallenge[];
};

export class LifeOSService {
  constructor(private readonly storage: IStorageService) {}

  async loadAll(userId: EntityId): Promise<LifeOSData> {
    const [bucketList, visionBoard, futureSelf, lifeBook, challenges] = await Promise.all([
      this.loadBucketList(userId),
      this.loadVisionBoard(userId),
      this.loadFutureSelf(userId),
      this.loadLifeBook(userId),
      this.loadChallenges(userId),
    ]);
    return { bucketList, visionBoard, futureSelf, lifeBook, challenges };
  }

  async addBucketItem(userId: EntityId, title: string, note?: string): Promise<BucketListItem> {
    const items = await this.loadBucketList(userId);
    const item = createBucketListItem({ userId, title, note, emoji: '✈️' });
    await this.storage.setItem(STORAGE_KEYS.bucketList, { ...await this.readMap(STORAGE_KEYS.bucketList), [userId]: [item, ...items] });
    return item;
  }

  async addVisionItem(userId: EntityId, title: string, description?: string): Promise<VisionBoardItem> {
    const items = await this.loadVisionBoard(userId);
    const item = createVisionBoardItem({ userId, title, description, emoji: '🎯' });
    await this.storage.setItem(STORAGE_KEYS.visionBoard, { ...await this.readMap(STORAGE_KEYS.visionBoard), [userId]: [item, ...items] });
    return item;
  }

  async addFutureSelf(userId: EntityId, title: string, body: string): Promise<FutureSelfNote> {
    const items = await this.loadFutureSelf(userId);
    const item = createFutureSelfNote({ userId, title, body });
    await this.storage.setItem(STORAGE_KEYS.futureSelf, { ...await this.readMap(STORAGE_KEYS.futureSelf), [userId]: [item, ...items] });
    return item;
  }

  async addLifeBookEntry(userId: EntityId, title: string, body: string, chapter?: string): Promise<LifeBookEntry> {
    const items = await this.loadLifeBook(userId);
    const item = createLifeBookEntry({ userId, title, body, chapter });
    await this.storage.setItem(STORAGE_KEYS.lifeBook, { ...await this.readMap(STORAGE_KEYS.lifeBook), [userId]: [item, ...items] });
    return item;
  }

  async addChallenge(userId: EntityId, title: string, description?: string, durationDays = 7): Promise<LifeChallenge> {
    const items = await this.loadChallenges(userId);
    const item = createLifeChallenge({ userId, title, description, durationDays });
    await this.storage.setItem(STORAGE_KEYS.lifeChallenges, { ...await this.readMap(STORAGE_KEYS.lifeChallenges), [userId]: [item, ...items] });
    return item;
  }

  async completeChallenge(userId: EntityId, challengeId: EntityId): Promise<void> {
    const items = await this.loadChallenges(userId);
    const next = items.map((c) =>
      c.id === challengeId ? { ...c, status: 'completed' as const, updatedAt: nowIso() } : c,
    );
    await this.storage.setItem(STORAGE_KEYS.lifeChallenges, { ...await this.readMap(STORAGE_KEYS.lifeChallenges), [userId]: next });
  }

  private async loadBucketList(userId: EntityId) {
    const map = await this.readMap<BucketListItem>(STORAGE_KEYS.bucketList);
    return (map[userId] ?? []).filter((i) => i.status === 'active').slice(0, 20);
  }

  private async loadVisionBoard(userId: EntityId) {
    const map = await this.readMap<VisionBoardItem>(STORAGE_KEYS.visionBoard);
    return (map[userId] ?? []).filter((i) => i.status === 'active').slice(0, 20);
  }

  private async loadFutureSelf(userId: EntityId) {
    const map = await this.readMap<FutureSelfNote>(STORAGE_KEYS.futureSelf);
    return (map[userId] ?? []).filter((i) => i.status === 'active').slice(0, 12);
  }

  private async loadLifeBook(userId: EntityId) {
    const map = await this.readMap<LifeBookEntry>(STORAGE_KEYS.lifeBook);
    return (map[userId] ?? []).slice(0, 30);
  }

  private async loadChallenges(userId: EntityId) {
    const map = await this.readMap<LifeChallenge>(STORAGE_KEYS.lifeChallenges);
    return (map[userId] ?? []).filter((i) => i.status === 'active').slice(0, 10);
  }

  private async readMap<T>(key: string): Promise<Record<string, T[]>> {
    return (await this.storage.getItem<Record<string, T[]>>(key)) ?? {};
  }
}

let instance: LifeOSService | null = null;

export function getLifeOSService(storage: IStorageService) {
  if (!instance) instance = new LifeOSService(storage);
  return instance;
}
