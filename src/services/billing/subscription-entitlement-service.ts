import { STORAGE_KEYS } from '../../constants/storage-keys';
import { IStorageService } from '../contracts';
import { EntitlementSnapshot } from './billing-types';

const DEFAULT_ENTITLEMENT: EntitlementSnapshot = {
  isPro: false,
  source: 'none',
  cachedAt: new Date(0).toISOString(),
  offline: false,
};

export class SubscriptionEntitlementService {
  private inMemory: EntitlementSnapshot = DEFAULT_ENTITLEMENT;
  private inMemoryUserId: string | null = null;
  private devOverride = false;

  constructor(private readonly storage: IStorageService) {}

  private cacheKey(userId: string) {
    return `${STORAGE_KEYS.subscriptionEntitlement}:${userId}`;
  }

  private resetInMemory() {
    this.inMemory = DEFAULT_ENTITLEMENT;
    this.inMemoryUserId = null;
  }

  async getCachedEntitlement(userId: string): Promise<EntitlementSnapshot> {
    if (this.inMemoryUserId && this.inMemoryUserId !== userId) {
      this.resetInMemory();
    }

    const stored = await this.storage.getItem<EntitlementSnapshot>(this.cacheKey(userId));
    if (stored) {
      this.inMemory = stored;
      this.inMemoryUserId = userId;
      return this.applyDevOverride(stored);
    }

    if (this.inMemoryUserId === userId) {
      return this.applyDevOverride(this.inMemory);
    }

    return this.applyDevOverride(DEFAULT_ENTITLEMENT);
  }

  async setEntitlement(userId: string, snapshot: EntitlementSnapshot): Promise<EntitlementSnapshot> {
    if (this.inMemoryUserId && this.inMemoryUserId !== userId) {
      this.resetInMemory();
    }

    const next = this.applyDevOverride(snapshot);
    this.inMemory = next;
    this.inMemoryUserId = userId;
    await this.storage.setItem(this.cacheKey(userId), snapshot);
    return next;
  }

  async clearEntitlement(userId: string): Promise<void> {
    await this.storage.removeItem(this.cacheKey(userId));
    if (this.inMemoryUserId === userId) {
      this.resetInMemory();
    }
  }

  async clearAllCachedEntitlements(): Promise<void> {
    this.resetInMemory();
  }

  getInMemoryEntitlement(): EntitlementSnapshot {
    return this.applyDevOverride(this.inMemory);
  }

  getCachedUserId(): string | null {
    return this.inMemoryUserId;
  }

  setDevOverride(enabled: boolean) {
    if (!__DEV__) return;
    this.devOverride = enabled;
  }

  isDevOverrideActive(): boolean {
    return __DEV__ && this.devOverride;
  }

  clearDevOverride() {
    this.devOverride = false;
  }

  private applyDevOverride(snapshot: EntitlementSnapshot): EntitlementSnapshot {
    if (!__DEV__ || !this.devOverride) return snapshot;
    return {
      ...snapshot,
      isPro: true,
      source: 'dev_override',
      cachedAt: new Date().toISOString(),
    };
  }
}
