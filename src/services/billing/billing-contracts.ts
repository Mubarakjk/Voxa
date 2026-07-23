import { UserProfile, UserSubscription } from '../../types';
import { BillingPeriod } from '../../types/subscription';
import { UsageBucket } from '../../types/subscription';
import { OfferingsSnapshot, PurchaseOutcome } from './billing-types';

/** RevenueCat / App Store / Play Billing — swappable purchase surface. */
export interface IPurchaseManager {
  isAvailable(): boolean;
  configure(appUserId?: string): Promise<void>;
  logOut(): Promise<void>;
  restorePurchases(appUserId: string): Promise<PurchaseOutcome>;
  purchaseSubscription(period: BillingPeriod, appUserId: string): Promise<PurchaseOutcome>;
  getOfferings(): Promise<OfferingsSnapshot>;
  refreshCustomerInfo(appUserId: string): Promise<import('./billing-types').CustomerInfoSnapshot>;
}

/** Remote subscription state — mirrored for analytics/support only. */
export interface ISubscriptionRepository {
  getSubscription(userId: string): Promise<UserSubscription>;
  saveSubscription(userId: string, subscription: UserSubscription): Promise<UserSubscription>;
  getUsage(userId: string): Promise<UsageBucket>;
  saveUsage(userId: string, usage: UsageBucket): Promise<UsageBucket>;
}

/** High-level billing orchestration — RevenueCat-backed. */
export interface IBillingService {
  getStatus(): BillingServiceStatus;
  getOfferings(): Promise<OfferingsSnapshot>;
  purchase(userId: string, period: BillingPeriod): Promise<PurchaseOutcome>;
  startTrial(userId: string): Promise<UserSubscription>;
  activatePro(
    userId: string,
    options?: { period?: BillingPeriod; isFoundingMember?: boolean },
  ): Promise<UserSubscription>;
  downgradeToFree(userId: string): Promise<UserSubscription>;
  restorePurchases(userId: string): Promise<UserSubscription>;
  syncSubscription(profile: UserProfile): Promise<UserSubscription>;
  configureForUser?(userId: string): Promise<void>;
  signOut?(userId: string): Promise<void>;
}

export type BillingServiceStatus = {
  provider: 'revenuecat';
  ready: boolean;
  message: string;
  runtime?: string;
  configured?: boolean;
};
