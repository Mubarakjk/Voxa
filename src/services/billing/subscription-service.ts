import { PRICING_CONFIG } from '../../constants/pricing';
import { IUserProfileRepository } from '../contracts';
import {
  createDefaultSubscription,
  PlanStatus,
  SubscriptionPlan,
  UserSubscription,
} from '../../types/subscription';
import { UserProfile, nowIso } from '../../types';
import { IBillingService, ISubscriptionRepository } from './billing-contracts';
import { UsageTrackingService } from './usage-tracking-service';

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

export class StubBillingService implements IBillingService {
  constructor(private readonly subscriptionRepo: ISubscriptionRepository) {}

  async startTrial(userId: string): Promise<UserSubscription> {
    const current = await this.subscriptionRepo.getSubscription(userId);
    if (current.trialUsed && !current.trialActive) {
      return current;
    }

    const start = nowIso();
    const end = new Date();
    end.setDate(end.getDate() + PRICING_CONFIG.trialDays);

    const next: UserSubscription = {
      ...current,
      subscriptionPlan: 'pro',
      trialStart: start,
      trialEnd: end.toISOString(),
      trialActive: true,
      trialUsed: true,
      billingStatus: 'trialing',
    };
    return this.subscriptionRepo.saveSubscription(userId, next);
  }

  async activatePro(
    userId: string,
    options?: { period?: import('../../types/subscription').BillingPeriod; isFoundingMember?: boolean },
  ): Promise<UserSubscription> {
    const current = await this.subscriptionRepo.getSubscription(userId);
    const next: UserSubscription = {
      ...current,
      subscriptionPlan: 'pro',
      trialActive: false,
      billingStatus: 'active',
      isFoundingMember: options?.isFoundingMember ?? current.isFoundingMember,
      productId: options?.period ? `voxa_pro_${options.period}` : 'voxa_pro_monthly',
    };
    return this.subscriptionRepo.saveSubscription(userId, next);
  }

  async downgradeToFree(userId: string): Promise<UserSubscription> {
    const next: UserSubscription = {
      ...createDefaultSubscription(),
      trialUsed: true,
    };
    return this.subscriptionRepo.saveSubscription(userId, next);
  }

  async restorePurchases(userId: string): Promise<UserSubscription> {
    return this.subscriptionRepo.getSubscription(userId);
  }

  async syncSubscription(profile: UserProfile): Promise<UserSubscription> {
    const subscription = profile.subscription ?? createDefaultSubscription();
    const synced = applyTrialExpiry(subscription);
    if (synced !== subscription) {
      return this.subscriptionRepo.saveSubscription(profile.id, synced);
    }
    return synced;
  }
}

export class SubscriptionService {
  constructor(
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly billing: IBillingService,
    private readonly usageTracking: UsageTrackingService,
  ) {}

  async syncProfile(profile: UserProfile): Promise<PlanStatus> {
    await this.billing.syncSubscription(profile);
    return this.getPlanStatus(profile.id);
  }

  getPlanStatus(userId: string, subscription?: UserSubscription): Promise<PlanStatus> {
    return this.buildPlanStatus(userId, subscription);
  }

  async buildPlanStatus(userId: string, subscriptionInput?: UserSubscription): Promise<PlanStatus> {
    const subscription = applyTrialExpiry(
      subscriptionInput ?? (await this.subscriptionRepo.getSubscription(userId)),
    );

    const isTrialActive = Boolean(subscription.trialActive && subscription.trialEnd);
    const trialDaysLeft = isTrialActive
      ? Math.max(0, Math.ceil((new Date(subscription.trialEnd!).getTime() - Date.now()) / 86400000))
      : 0;

    const effectivePlan: SubscriptionPlan =
      subscription.subscriptionPlan === 'pro' || isTrialActive ? 'pro' : 'free';

    return {
      effectivePlan,
      isPro: effectivePlan === 'pro',
      isTrialActive: isTrialActive && trialDaysLeft > 0,
      trialDaysLeft,
      trialEnd: subscription.trialEnd,
      subscriptionPlan: subscription.subscriptionPlan,
      isFoundingMember: Boolean(subscription.isFoundingMember),
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
