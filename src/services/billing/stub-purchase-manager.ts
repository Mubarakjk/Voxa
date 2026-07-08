import { BillingPeriod } from '../../types/subscription';
import { IPurchaseManager } from './billing-contracts';

/** Placeholder until RevenueCat / native IAP is wired. */
export class StubPurchaseManager implements IPurchaseManager {
  async restorePurchases(): Promise<void> {
    console.info('[Voxa] Restore purchases — billing not connected yet.');
  }

  async purchaseSubscription(period: BillingPeriod): Promise<void> {
    console.info(`[Voxa] Purchase ${period} — billing not connected yet.`);
  }

  async getCustomerInfo(): Promise<Record<string, unknown>> {
    return { provider: 'stub', active: false };
  }
}
