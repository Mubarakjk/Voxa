import { isBillingDormant } from '../../config/launch-mode';
import { BillingPeriod, PlanStatus, UserSubscription } from '../../types/subscription';
import { UserProfile } from '../../types';
import { IBillingService } from './billing-contracts';
import { EntitlementSnapshot, OfferingsSnapshot, PurchaseOutcome } from './billing-types';
import { RevenueCatPurchaseManager } from './revenuecat-purchase-manager';
import { RevenueCatSubscriptionSynchroniser } from './revenuecat-subscription-synchroniser';
import { SubscriptionEntitlementService } from './subscription-entitlement-service';
import { SubscriptionService } from './subscription-service';

/**
 * Single production billing entry point for RevenueCat + App Store subscriptions.
 * UI and feature gates should use this service (or EntitlementAccessService), not the SDK directly.
 */
export class BillingService {
  constructor(
    private readonly store: IBillingService,
    private readonly subscription: SubscriptionService,
    private readonly entitlementService: SubscriptionEntitlementService,
    private readonly synchroniser: RevenueCatSubscriptionSynchroniser,
    private readonly purchaseManager: RevenueCatPurchaseManager,
  ) {}

  /** Configure RevenueCat once per process and identify the Supabase/local user. */
  async configureForUser(userId: string): Promise<void> {
    if (isBillingDormant()) return;
    if (this.store.configureForUser) {
      await this.store.configureForUser(userId);
    }
  }

  /** Clear entitlement cache and RevenueCat identity on sign-out. */
  async signOut(userId: string): Promise<void> {
    if (this.store.signOut) {
      await this.store.signOut(userId);
    }
  }

  /** Startup / post-auth sync — never throws to callers. */
  async syncProfile(profile: UserProfile): Promise<PlanStatus> {
    return this.subscription.syncProfile(profile);
  }

  /** Foreground refresh — safe when offline (keeps last known entitlement). */
  async refreshOnForeground(userId: string): Promise<EntitlementSnapshot> {
    try {
      return await this.synchroniser.refreshAndSync(userId);
    } catch {
      return await this.entitlementService.getCachedEntitlement(userId);
    }
  }

  getStatus() {
    return this.store.getStatus();
  }

  getOfferings(): Promise<OfferingsSnapshot> {
    return this.store.getOfferings();
  }

  async purchase(userId: string, period: BillingPeriod): Promise<PurchaseOutcome> {
    return this.store.purchase(userId, period);
  }

  async restorePurchases(userId: string): Promise<{ subscription: UserSubscription; isPro: boolean }> {
    const subscription = await this.store.restorePurchases(userId);
    const status = await this.getPlanStatus(userId);
    return { subscription, isPro: status.isPro };
  }

  getPlanStatus(userId: string): Promise<PlanStatus> {
    return this.subscription.getPlanStatus(userId);
  }

  async isPro(userId: string): Promise<boolean> {
    const status = await this.getPlanStatus(userId);
    return status.isPro;
  }

  /** Subscribe to entitlement changes (purchase, restore, listener, expiry). */
  subscribeEntitlement(listener: (userId: string) => void): () => void {
    return this.entitlementService.subscribe(listener);
  }

  /** @internal QA / diagnostics only */
  getPurchaseManager(): RevenueCatPurchaseManager {
    return this.purchaseManager;
  }

  /** @internal Supabase mirror + isolation checks */
  getSynchroniser(): RevenueCatSubscriptionSynchroniser {
    return this.synchroniser;
  }
}
