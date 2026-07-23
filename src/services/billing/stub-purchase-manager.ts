import { BillingPeriod } from '../../types/subscription';
import { IPurchaseManager } from './billing-contracts';
import { PurchaseOutcome, OfferingsSnapshot, CustomerInfoSnapshot } from './billing-types';

/** Legacy placeholder — not wired in production. RevenueCat is the active provider. */
export class StubPurchaseManager implements IPurchaseManager {
  isAvailable(): boolean {
    return false;
  }

  async configure(): Promise<void> {
    console.info('[Voxa] Stub purchase manager — not connected.');
  }

  async logOut(): Promise<void> {}

  async restorePurchases(_appUserId: string): Promise<PurchaseOutcome> {
    console.info('[Voxa] Restore purchases — billing not connected.');
    return { success: false, errorMessage: 'Billing not connected.' };
  }

  async purchaseSubscription(_period: BillingPeriod, _appUserId: string): Promise<PurchaseOutcome> {
    console.info('[Voxa] Purchase — billing not connected.');
    return { success: false, errorMessage: 'Billing not connected.' };
  }

  async getOfferings(): Promise<OfferingsSnapshot> {
    return {
      configured: false,
      source: 'fallback',
      trialEligible: false,
      loadedAt: new Date().toISOString(),
    };
  }

  async refreshCustomerInfo(appUserId: string): Promise<CustomerInfoSnapshot> {
    return {
      appUserId,
      configured: false,
      offeringsLoaded: false,
      entitlement: {
        isPro: false,
        source: 'none',
        cachedAt: new Date().toISOString(),
        offline: true,
      },
    };
  }
}
