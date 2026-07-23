import { IUserProfileRepository } from '../contracts';
import {
  createDefaultSubscription,
  PlanStatus,
  UserSubscription,
} from '../../types/subscription';
import { UserProfile, nowIso } from '../../types';
import { IBillingService, ISubscriptionRepository } from './billing-contracts';
import { UsageTrackingService } from './usage-tracking-service';
import { SubscriptionEntitlementService } from './subscription-entitlement-service';
import { EntitlementSnapshot } from './billing-types';
import { migrateLegacyLocalSubscription } from './legacy-subscription-migration';
import { IStorageService } from '../contracts';

export class FeatureLimitError extends Error {
  constructor(
    message: string,
    public readonly feature: string,
    public readonly limitReached = true,
  ) {
    super(message);
    this.name = 'FeatureLimitError';
  }
}

export class LocalSubscriptionRepository implements ISubscriptionRepository {
  constructor(
    private readonly profileRepo: IUserProfileRepository,
    private readonly usageTracking: UsageTrackingService,
  ) {}

  async getSubscription(userId: string): Promise<UserSubscription> {
    const profile = await this.profileRepo.getProfile();
    if (!profile || profile.id !== userId) return createDefaultSubscription();
    return profile.subscription ?? createDefaultSubscription();
  }

  async saveSubscription(userId: string, subscription: UserSubscription): Promise<UserSubscription> {
    await this.profileRepo.updateProfile({ subscription });
    return subscription;
  }

  async getUsage(userId: string) {
    return this.usageTracking.getUsage(userId);
  }

  async saveUsage(userId: string, usage: import('../../types/subscription').UsageBucket) {
    return this.usageTracking.saveUsage(userId, usage);
  }
}

export function applyTrialExpiry(subscription: UserSubscription): UserSubscription {
  if (!subscription.trialActive || !subscription.trialEnd) return subscription;
  if (new Date(subscription.trialEnd).getTime() > Date.now()) return subscription;

  return {
    ...subscription,
    trialActive: false,
    subscriptionPlan: subscription.billingStatus === 'active' ? 'pro' : 'free',
    billingStatus: subscription.billingStatus === 'active' ? 'active' : 'expired',
  };
}

function planStatusFromEntitlement(
  entitlement: EntitlementSnapshot,
  subscription: UserSubscription,
): PlanStatus {
  const isTrialActive = Boolean(entitlement.isTrialActive && entitlement.trialEnd);
  const trialDaysLeft = isTrialActive && entitlement.trialEnd
    ? Math.max(0, Math.ceil((new Date(entitlement.trialEnd).getTime() - Date.now()) / 86400000))
    : 0;

  const isPro = entitlement.isPro;
  const effectivePlan = isPro ? 'pro' : 'free';

  return {
    effectivePlan,
    isPro,
    isTrialActive: isTrialActive && trialDaysLeft > 0,
    trialDaysLeft,
    trialEnd: entitlement.trialEnd ?? subscription.trialEnd,
    subscriptionPlan: isPro ? 'pro' : subscription.subscriptionPlan,
    isFoundingMember: Boolean(subscription.isFoundingMember),
    billingPeriod: entitlement.billingPeriod,
    renewalDate: entitlement.expiresAt,
    billingIssue: entitlement.billingIssue,
    gracePeriod: entitlement.gracePeriod,
    entitlementSource: entitlement.source,
    productId: entitlement.productId,
  };
}

export class SubscriptionService {
  constructor(
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly billing: IBillingService,
    private readonly usageTracking: UsageTrackingService,
    private readonly entitlementService: SubscriptionEntitlementService,
    private readonly storage: IStorageService,
  ) {}

  async syncProfile(profile: UserProfile): Promise<PlanStatus> {
    const { subscription, migrated } = await migrateLegacyLocalSubscription(
      this.storage,
      profile.id,
      profile.subscription ?? createDefaultSubscription(),
    );

    if (migrated) {
      await this.subscriptionRepo.saveSubscription(profile.id, subscription);
    }

    if (this.billing.configureForUser) {
      await this.billing.configureForUser(profile.id);
    } else {
      await this.billing.syncSubscription({ ...profile, subscription });
    }

    return this.getPlanStatus(profile.id);
  }

  getPlanStatus(userId: string, subscription?: UserSubscription): Promise<PlanStatus> {
    return this.buildPlanStatus(userId, subscription);
  }

  async buildPlanStatus(userId: string, subscriptionInput?: UserSubscription): Promise<PlanStatus> {
    const entitlement = await this.entitlementService.getCachedEntitlement(userId);
    const subscription = applyTrialExpiry(
      subscriptionInput ?? (await this.subscriptionRepo.getSubscription(userId)),
    );

    if (entitlement.cachedAt !== new Date(0).toISOString()) {
      return planStatusFromEntitlement(entitlement, subscription);
    }

    // Never grant Pro from profiles.subscription mirror alone.
    return {
      effectivePlan: 'free',
      isPro: false,
      isTrialActive: false,
      trialDaysLeft: 0,
      subscriptionPlan: 'free',
      isFoundingMember: Boolean(subscription.isFoundingMember),
      entitlementSource: 'none',
      productId: subscription.productId,
    };
  }

  async startTrial(userId: string) {
    return this.billing.startTrial(userId);
  }

  async continueFree(userId: string) {
    return this.billing.downgradeToFree(userId);
  }

  async restorePurchases(userId: string) {
    return this.billing.restorePurchases(userId);
  }

  async purchase(userId: string, period: import('../../types/subscription').BillingPeriod) {
    return this.billing.purchase(userId, period);
  }

  async getOfferings() {
    return this.billing.getOfferings();
  }

  async getBillingStatus() {
    return this.billing.getStatus();
  }

  async signOutBilling(userId: string) {
    if (this.billing.signOut) {
      await this.billing.signOut(userId);
    }
  }

  async getUsage(userId: string) {
    return this.usageTracking.getUsage(userId);
  }

  async refreshUsageCounts(userId: string, repositories: {
    memories: { listMemories(userId: string): Promise<unknown[]> };
    goals: { listGoals(userId: string): Promise<unknown[]> };
    reminders: { listReminders(userId: string): Promise<unknown[]> };
  }) {
    const [memories, goals, reminders] = await Promise.all([
      repositories.memories.listMemories(userId),
      repositories.goals.listGoals(userId),
      repositories.reminders.listReminders(userId),
    ]);
    return this.usageTracking.syncCounts(userId, {
      memories: memories.length,
      goals: goals.length,
      reminders: reminders.length,
    });
  }
}
