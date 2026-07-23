import { STORAGE_KEYS } from '../../constants/storage-keys';
import { createUuid, EntityId, nowIso } from '../../types';
import { AwardXpResult, XpProfile, XpSource, XpTransaction } from '../../types/phase10-play';
import { IStorageService } from '../contracts';

const XP_PER_LEVEL = 100;

function xpForLevel(level: number): number {
  return level * XP_PER_LEVEL;
}

export class XpService {
  constructor(private readonly storage: IStorageService) {}

  async get(userId: EntityId): Promise<XpProfile> {
    const map = (await this.storage.getItem<Record<string, XpProfile>>(STORAGE_KEYS.xpProfiles)) ?? {};
    return map[userId] ?? {
      userId,
      totalXp: 0,
      level: 1,
      xpToNextLevel: XP_PER_LEVEL,
      lifetimeXp: 0,
      updatedAt: nowIso(),
    };
  }

  async listLedger(userId: EntityId, limit = 20): Promise<XpTransaction[]> {
    const map = (await this.storage.getItem<Record<string, XpTransaction[]>>(STORAGE_KEYS.xpLedger)) ?? {};
    return (map[userId] ?? []).filter((t) => !t.revoked).slice(0, limit);
  }

  async award(
    userId: EntityId,
    amount: number,
    source: XpSource,
    referenceId?: string,
  ): Promise<AwardXpResult> {
    if (amount <= 0) {
      const profile = await this.get(userId);
      return {
        profile,
        transaction: {
          id: createUuid(),
          userId,
          amount: 0,
          source,
          referenceId,
          createdAt: nowIso(),
        },
        leveledUp: false,
        oldLevel: profile.level,
        newLevel: profile.level,
      };
    }

    if (referenceId) {
      const existing = await this.findActiveByReference(userId, referenceId);
      if (existing) {
        const profile = await this.get(userId);
        return {
          profile,
          transaction: existing,
          leveledUp: false,
          oldLevel: profile.level,
          newLevel: profile.level,
        };
      }
    }

    const current = await this.get(userId);
    const oldLevel = current.level;
    let totalXp = current.totalXp + amount;
    let level = current.level;
    let xpToNext = current.xpToNextLevel;

    while (totalXp >= xpToNext) {
      totalXp -= xpToNext;
      level += 1;
      xpToNext = xpForLevel(level);
    }

    const profile: XpProfile = {
      userId,
      totalXp,
      level,
      xpToNextLevel: xpToNext,
      lifetimeXp: current.lifetimeXp + amount,
      updatedAt: nowIso(),
    };

    const transaction: XpTransaction = {
      id: createUuid(),
      userId,
      amount,
      source,
      referenceId,
      createdAt: nowIso(),
    };

    const profileMap = (await this.storage.getItem<Record<string, XpProfile>>(STORAGE_KEYS.xpProfiles)) ?? {};
    profileMap[userId] = profile;
    await this.storage.setItem(STORAGE_KEYS.xpProfiles, profileMap);

    const ledgerMap = (await this.storage.getItem<Record<string, XpTransaction[]>>(STORAGE_KEYS.xpLedger)) ?? {};
    ledgerMap[userId] = [transaction, ...(ledgerMap[userId] ?? [])].slice(0, 200);
    await this.storage.setItem(STORAGE_KEYS.xpLedger, ledgerMap);

    return {
      profile,
      transaction,
      leveledUp: level > oldLevel,
      oldLevel,
      newLevel: level,
    };
  }

  async revokeTransaction(userId: EntityId, transactionId: EntityId): Promise<XpProfile | null> {
    const ledgerMap = (await this.storage.getItem<Record<string, XpTransaction[]>>(STORAGE_KEYS.xpLedger)) ?? {};
    const ledger = ledgerMap[userId] ?? [];
    const tx = ledger.find((t) => t.id === transactionId && !t.revoked);
    if (!tx) return null;

    tx.revoked = true;
    ledgerMap[userId] = ledger;
    await this.storage.setItem(STORAGE_KEYS.xpLedger, ledgerMap);

    const current = await this.get(userId);
    let totalXp = Math.max(0, current.totalXp - tx.amount);
    let level = current.level;
    let xpToNext = current.xpToNextLevel;

    while (level > 1 && totalXp < 0) {
      level -= 1;
      xpToNext = xpForLevel(level);
      totalXp += xpToNext;
    }
    if (totalXp < 0) totalXp = 0;

    while (totalXp >= xpToNext) {
      totalXp -= xpToNext;
      level += 1;
      xpToNext = xpForLevel(level);
    }

    const profile: XpProfile = {
      userId,
      totalXp,
      level,
      xpToNextLevel: xpToNext,
      lifetimeXp: Math.max(0, current.lifetimeXp - tx.amount),
      updatedAt: nowIso(),
    };

    const profileMap = (await this.storage.getItem<Record<string, XpProfile>>(STORAGE_KEYS.xpProfiles)) ?? {};
    profileMap[userId] = profile;
    await this.storage.setItem(STORAGE_KEYS.xpProfiles, profileMap);
    return profile;
  }

  private async findActiveByReference(userId: EntityId, referenceId: string): Promise<XpTransaction | undefined> {
    const ledgerMap = (await this.storage.getItem<Record<string, XpTransaction[]>>(STORAGE_KEYS.xpLedger)) ?? {};
    return (ledgerMap[userId] ?? []).find((t) => t.referenceId === referenceId && !t.revoked);
  }
}

let instance: XpService | null = null;

export function getXpService(storage: IStorageService) {
  if (!instance) instance = new XpService(storage);
  return instance;
}
