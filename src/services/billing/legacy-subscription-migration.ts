import { STORAGE_KEYS } from '../../constants/storage-keys';
import { IStorageService } from '../contracts';
import { UserSubscription, createDefaultSubscription } from '../../types/subscription';
import { EntitlementSnapshot } from './billing-types';

type LegacyMigrationState = {
  migratedAt: string;
  hadLegacyStub: boolean;
  previousPlan?: string;
};

export async function migrateLegacyLocalSubscription(
  storage: IStorageService,
  userId: string,
  subscription: UserSubscription,
): Promise<{ subscription: UserSubscription; migrated: boolean }> {
  const key = `${STORAGE_KEYS.legacySubscriptionMigration}:${userId}`;
  const existing = await storage.getItem<LegacyMigrationState>(key);
  if (existing) {
    return { subscription, migrated: false };
  }

  const hadLegacyStub =
    subscription.subscriptionPlan === 'pro' &&
    subscription.billingStatus !== 'active' &&
    !subscription.productId?.startsWith('voxa_pro_');

  const cleaned: UserSubscription = {
    ...createDefaultSubscription(),
    trialUsed: subscription.trialUsed,
    billingStatus: 'none',
    productId: undefined,
  };

  await storage.setItem<LegacyMigrationState>(key, {
    migratedAt: new Date().toISOString(),
    hadLegacyStub,
    previousPlan: subscription.subscriptionPlan,
  });

  return { subscription: hadLegacyStub ? cleaned : subscription, migrated: hadLegacyStub };
}

export function entitlementToSubscriptionSnapshot(
  entitlement: EntitlementSnapshot,
  previous?: UserSubscription,
): UserSubscription {
  const base = previous ?? createDefaultSubscription();

  if (!entitlement.isPro) {
    return {
      ...createDefaultSubscription(),
      trialUsed: base.trialUsed || entitlement.isTrialActive === false,
      billingStatus: entitlement.refunded ? 'cancelled' : 'none',
    };
  }

  return {
    ...base,
    subscriptionPlan: 'pro',
    trialActive: Boolean(entitlement.isTrialActive),
    trialEnd: entitlement.trialEnd,
    trialUsed: base.trialUsed || Boolean(entitlement.isTrialActive),
    productId: entitlement.productId,
    billingStatus: entitlement.billingIssue
      ? 'expired'
      : entitlement.isTrialActive
        ? 'trialing'
        : 'active',
  };
}
