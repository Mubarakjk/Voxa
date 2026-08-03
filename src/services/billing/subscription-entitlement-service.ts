import { STORAGE_KEYS } from '../../constants/storage-keys';
import { IStorageService } from '../contracts';
import { EntitlementSnapshot } from './billing-types';
import { normalizeEntitlementSnapshot } from './entitlement-normalize';

const DEFAULT_ENTITLEMENT: EntitlementSnapshot = {
  isPro: false,
  source: 'none',
  cachedAt: new Date(0).toISOString(),
  offline: false,
};

export type EntitlementChangeListener = (userId: string, entitlement: EntitlementSnapshot) => void;

export class SubscriptionEntitlementService {
  private inMemory: EntitlementSnapshot = DEFAULT_ENTITLEMENT;
  private inMemoryUserId: string | null = null;
  private devOverride = false;
  private listeners = new Set<EntitlementChangeListener>();

  constructor(private readonly storage: IStorageService) {}

  private cacheKey(userId: string) {
    return `${STORAGE_KEYS.subscriptionEntitlement}:${userId}`;
  }

  private resetInMemory() {
    this.inMemory = DEFAULT_ENTITLEMENT;
    this.inMemoryUserId = null;
  }

  subscribe(listener: EntitlementChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(userId: string, entitlement: EntitlementSnapshot) {
    this.listeners.forEach((listener) => {
      try {
        listener(userId, entitlement);
      } catch {
        // Ignore listener errors so one bad UI subscriber cannot break billing.
      }
    });
  }

  async getCachedEntitlement(userId: string): Promise<EntitlementSnapshot> {
    if (this.inMemoryUserId && this.inMemoryUserId !== userId) {
      this.resetInMemory();
    }

    const stored = await this.storage.getItem<EntitlementSnapshot>(this.cacheKey(userId));
    if (stored) {
      const normalized = this.applyDevOverride(normalizeEntitlementSnapshot(stored));
      this.inMemory = normalized;
      this.inMemoryUserId = userId;

      if (stored.isPro && !normalized.isPro) {
        await this.storage.setItem(this.cacheKey(userId), normalized);
        this.notify(userId, normalized);
      }

      return normalized;
    }

    if (this.inMemoryUserId === userId) {
      return this.applyDevOverride(normalizeEntitlementSnapshot(this.inMemory));
    }

    return this.applyDevOverride(DEFAULT_ENTITLEMENT);
  }

  async setEntitlement(userId: string, snapshot: EntitlementSnapshot): Promise<EntitlementSnapshot> {
    if (this.inMemoryUserId && this.inMemoryUserId !== userId) {
      this.resetInMemory();
    }

    const normalized = normalizeEntitlementSnapshot(snapshot);
    const next = this.applyDevOverride(normalized);
    this.inMemory = next;
    this.inMemoryUserId = userId;
    await this.storage.setItem(this.cacheKey(userId), normalized);
    this.notify(userId, next);
    return next;
  }

  async clearEntitlement(userId: string): Promise<void> {
    await this.storage.removeItem(this.cacheKey(userId));
    if (this.inMemoryUserId === userId) {
      this.resetInMemory();
      this.notify(userId, DEFAULT_ENTITLEMENT);
    }
  }

  async clearAllCachedEntitlements(): Promise<void> {
    const previousUserId = this.inMemoryUserId;
    this.resetInMemory();
    if (previousUserId) {
      this.notify(previousUserId, DEFAULT_ENTITLEMENT);
    }
  }

  getInMemoryEntitlement(): EntitlementSnapshot {
    return this.applyDevOverride(normalizeEntitlementSnapshot(this.inMemory));
  }

  getCachedUserId(): string | null {
    return this.inMemoryUserId;
  }

  setDevOverride(enabled: boolean) {
    if (!__DEV__) return;
    this.devOverride = enabled;
    if (this.inMemoryUserId) {
      this.notify(this.inMemoryUserId, this.getInMemoryEntitlement());
    }
  }

  isDevOverrideActive(): boolean {
    return __DEV__ && this.devOverride;
  }

  clearDevOverride() {
    this.devOverride = false;
    if (this.inMemoryUserId) {
      this.notify(this.inMemoryUserId, this.getInMemoryEntitlement());
    }
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
