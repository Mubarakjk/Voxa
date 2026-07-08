import { UserProfile, UserSubscription } from '../../types';
import { BillingPeriod } from '../../types/subscription';
import { UsageBucket } from '../../types/subscription';

/** RevenueCat / App Store / Play Billing — swappable purchase surface. */
export interface IPurchaseManager {
  restorePurchases(): Promise<void>;
  purchaseSubscription(period: BillingPeriod): Promise<void>;
  getCustomerInfo(): Promise<Record<string, unknown>>;
}

/** Remote subscription state — swappable for RevenueCat webhooks / Supabase. */
export interface ISubscriptionRepository {
  getSubscription(userId: string): Promise<UserSubscription>;
  saveSubscription(userId: string, subscription: UserSubscription): Promise<UserSubscription>;
  getUsage(userId: string): Promise<UsageBucket>;
  saveUsage(userId: string, usage: UsageBucket): Promise<UsageBucket>;
}

/** High-level billing orchestration — swappable for RevenueCat SDK. */
export interface IBillingService {
  startTrial(userId: string): Promise<UserSubscription>;
  activatePro(userId: string, options?: { period?: BillingPeriod; isFoundingMember?: boolean }): Promise<UserSubscription>;
  downgradeToFree(userId: string): Promise<UserSubscription>;
  restorePurchases(userId: string): Promise<UserSubscription>;
  syncSubscription(profile: UserProfile): Promise<UserSubscription>;
}

export type BillingServiceStatus = {
  provider: 'stub' | 'revenuecat';
  ready: boolean;
  message: string;
};
