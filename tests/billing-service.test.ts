import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BillingService } from '../src/services/billing/billing-service';
import { EntitlementSnapshot } from '../src/services/billing/billing-types';
import { IBillingService } from '../src/services/billing/billing-contracts';
import { RevenueCatPurchaseManager } from '../src/services/billing/revenuecat-purchase-manager';
import { RevenueCatSubscriptionSynchroniser } from '../src/services/billing/revenuecat-subscription-synchroniser';
import { SubscriptionEntitlementService } from '../src/services/billing/subscription-entitlement-service';
import { SubscriptionService } from '../src/services/billing/subscription-service';
import { BillingPeriod, PlanStatus } from '../src/types/subscription';

function makeBillingService(overrides: {
  store?: Partial<IBillingService>;
  planStatus?: PlanStatus;
  entitlement?: EntitlementSnapshot;
}) {
  const entitlement: EntitlementSnapshot = overrides.entitlement ?? {
    isPro: false,
    source: 'none',
    cachedAt: new Date().toISOString(),
    offline: false,
  };

  const store: IBillingService = {
    getStatus: () => ({
      provider: 'revenuecat',
      ready: true,
      message: 'ok',
    }),
    getOfferings: async () => ({
      configured: true,
      source: 'store',
      trialEligible: false,
      loadedAt: new Date().toISOString(),
      monthlyPackageValid: true,
      annualPackageValid: true,
    }),
    purchase: async () => ({ success: true, productId: 'voxa_pro_monthly' }),
    startTrial: async () => {
      throw new Error('n/a');
    },
    activatePro: async () => {
      throw new Error('n/a');
    },
    downgradeToFree: async () => ({
      subscriptionPlan: 'free',
      billingStatus: 'none',
      trialActive: false,
    }),
    restorePurchases: async () => ({
      subscriptionPlan: 'free',
      billingStatus: 'none',
      trialActive: false,
    }),
    syncSubscription: async () => ({
      subscriptionPlan: 'free',
      billingStatus: 'none',
      trialActive: false,
    }),
    configureForUser: async () => undefined,
    signOut: async () => undefined,
    ...overrides.store,
  };

  const subscription = {
    syncProfile: async () => overrides.planStatus ?? ({ isPro: false, effectivePlan: 'free' } as PlanStatus),
    getPlanStatus: async () => overrides.planStatus ?? ({ isPro: false, effectivePlan: 'free' } as PlanStatus),
  } as unknown as SubscriptionService;

  const entitlementService = {
    subscribe: (listener: (userId: string) => void) => {
      listener('user-1');
      return () => undefined;
    },
    getCachedEntitlement: async () => entitlement,
  } as unknown as SubscriptionEntitlementService;

  const synchroniser = {
    refreshAndSync: async () => entitlement,
  } as unknown as RevenueCatSubscriptionSynchroniser;

  const purchaseManager = {} as RevenueCatPurchaseManager;

  return new BillingService(store, subscription, entitlementService, synchroniser, purchaseManager);
}

describe('BillingService', () => {
  it('delegates purchase to store layer', async () => {
    let called = false;
    const svc = makeBillingService({
      store: {
        purchase: async (_userId, period: BillingPeriod) => {
          called = true;
          assert.equal(period, 'annual');
          return { success: true, productId: 'voxa_pro_annual' };
        },
      },
    });
    const outcome = await svc.purchase('user-1', 'annual');
    assert.equal(called, true);
    assert.equal(outcome.success, true);
  });

  it('returns isPro false after restore with no entitlement', async () => {
    const svc = makeBillingService({
      planStatus: {
        isPro: false,
        effectivePlan: 'free',
        isTrialActive: false,
        trialDaysLeft: 0,
        subscriptionPlan: 'free',
        isFoundingMember: false,
        entitlementSource: 'none',
      },
    });
    const result = await svc.restorePurchases('user-1');
    assert.equal(result.isPro, false);
  });

  it('refreshOnForeground falls back to cached entitlement when sync fails', async () => {
    const cached: EntitlementSnapshot = {
      isPro: true,
      source: 'revenuecat',
      entitlementId: 'voxa_pro',
      cachedAt: new Date().toISOString(),
      offline: true,
    };

    const store: IBillingService = {
      getStatus: () => ({ provider: 'revenuecat', ready: true, message: 'ok' }),
      getOfferings: async () => ({ configured: false, source: 'fallback', trialEligible: false, loadedAt: '' }),
      purchase: async () => ({ success: false }),
      startTrial: async () => {
        throw new Error('n/a');
      },
      activatePro: async () => {
        throw new Error('n/a');
      },
      downgradeToFree: async () => ({ subscriptionPlan: 'free', billingStatus: 'none', trialActive: false }),
      restorePurchases: async () => ({ subscriptionPlan: 'free', billingStatus: 'none', trialActive: false }),
      syncSubscription: async () => ({ subscriptionPlan: 'free', billingStatus: 'none', trialActive: false }),
    };

    const entitlementService = {
      getCachedEntitlement: async () => cached,
      subscribe: () => () => undefined,
    } as unknown as SubscriptionEntitlementService;

    const synchroniser = {
      refreshAndSync: async () => {
        throw new Error('offline');
      },
    } as unknown as RevenueCatSubscriptionSynchroniser;

    const svc = new BillingService(
      store,
      {} as SubscriptionService,
      entitlementService,
      synchroniser,
      {} as RevenueCatPurchaseManager,
    );

    const result = await svc.refreshOnForeground('user-1');
    assert.equal(result.isPro, true);
  });
});
