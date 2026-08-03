import { UserProfile } from '../../types';
import { BillingPeriod, UserSubscription } from '../../types/subscription';
import { IBillingService, ISubscriptionRepository } from './billing-contracts';
import { OfferingsSnapshot, PurchaseOutcome } from './billing-types';
import { BillingLog } from './billing-logger';
import { RevenueCatPurchaseManager } from './revenuecat-purchase-manager';
import { RevenueCatSubscriptionSynchroniser } from './revenuecat-subscription-synchroniser';
import { SubscriptionEntitlementService } from './subscription-entitlement-service';
import { applyTrialExpiry } from './subscription-service';
import { getBillingRuntime } from './runtime-environment';
import { hasRevenueCatConfig } from '../../config/revenuecat-env';

export class RevenueCatBillingService implements IBillingService {
  constructor(
    private readonly purchaseManager: RevenueCatPurchaseManager,
    private readonly synchroniser: RevenueCatSubscriptionSynchroniser,
    private readonly entitlementService: SubscriptionEntitlementService,
    private readonly subscriptionRepo: ISubscriptionRepository,
  ) {}

  getStatus() {
    const runtime = getBillingRuntime();
    return {
      provider: 'revenuecat' as const,
      ready: this.purchaseManager.isAvailable(),
      message: this.purchaseManager.getStatusMessage(),
      runtime: runtime.environmentLabel,
      configured: hasRevenueCatConfig(),
    };
  }

  async getOfferings(): Promise<OfferingsSnapshot> {
    return this.purchaseManager.getOfferings();
  }

  async purchase(userId: string, period: BillingPeriod): Promise<PurchaseOutcome> {
    const outcome = await this.purchaseManager.purchaseSubscription(period, userId);
    if (outcome.cancelled || outcome.pending) return outcome;
    if (!outcome.success) return outcome;

    const entitlement = await this.synchroniser.refreshAndSync(userId);
    if (!entitlement.isPro) {
      return {
        success: false,
        pending: true,
        productId: outcome.productId,
        errorMessage: 'Purchase received. Waiting for Pro activation…',
      };
    }

    return outcome;
  }

  async startTrial(_userId: string): Promise<UserSubscription> {
    throw new Error('Trials are managed by the App Store or Google Play during purchase.');
  }

  async activatePro(_userId: string): Promise<UserSubscription> {
    throw new Error('Use purchase() for real subscriptions.');
  }

  async downgradeToFree(userId: string): Promise<UserSubscription> {
    const next = await this.subscriptionRepo.getSubscription(userId);
    return applyTrialExpiry(next);
  }

  async restorePurchases(userId: string): Promise<UserSubscription> {
    await this.purchaseManager.restorePurchases(userId);
    await this.synchroniser.refreshAndSync(userId);
    return this.subscriptionRepo.getSubscription(userId);
  }

  async syncSubscription(profile: UserProfile): Promise<UserSubscription> {
    const entitlement = await this.synchroniser.refreshAndSync(profile.id);
    const current = await this.subscriptionRepo.getSubscription(profile.id);
    const synced = applyTrialExpiry(current);

    if (!entitlement.isPro && synced.subscriptionPlan === 'pro') {
      return this.subscriptionRepo.saveSubscription(profile.id, {
        ...createFreeMirrorFrom(synced),
      });
    }

    return synced;
  }

  async configureForUser(userId: string): Promise<void> {
    try {
      if (!hasRevenueCatConfig()) {
        if (__DEV__) {
          console.info('[Voxa Billing] Billing unavailable in this development build.');
        }
        return;
      }
      await this.purchaseManager.configure(userId);
      await this.synchroniser.linkAuthenticatedUser(userId);
    } catch (err) {
      BillingLog.configureFailure(err instanceof Error ? err.message : 'Billing configure failed');
      if (__DEV__) {
        console.error('[Voxa Billing] configureForUser failed (non-blocking)', err);
      }
      // Keep cached/free entitlement — never block app bootstrap.
    }
  }

  async signOut(userId: string): Promise<void> {
    await this.synchroniser.clearForSignOut(userId);
  }
}

function createFreeMirrorFrom(subscription: UserSubscription): UserSubscription {
  return {
    ...subscription,
    subscriptionPlan: 'free',
    trialActive: false,
    billingStatus: 'none',
    productId: undefined,
  };
}
