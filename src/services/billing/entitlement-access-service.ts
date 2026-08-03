import { areAllFeaturesUnlocked, isPaywallEnabled } from '../../config/launch-mode';
import { getUnlockedPlanStatus } from '../../constants/free-launch-plan-status';
import { FeatureGateService } from './feature-gate-service';
import { PaywallImpressionService } from './paywall-impression-service';
import { SubscriptionService } from './subscription-service';
import { trackEvent } from '../analytics/analytics-service';
import { UserProfile } from '../../types';
import {
  GateFeature,
  PlanStatus,
} from '../../types/subscription';
import { toFriendlyBillingError } from './friendly-billing-errors';

export type FeatureAccessKey =
  | 'premium_voices'
  | 'notes_advanced_ai'
  | 'notes_semantic_search'
  | 'exports'
  | 'advanced_memory'
  | 'weekly_letter'
  | 'priority_ai';

/**
 * Single entry point for Pro checks — screens should not call RevenueCat directly.
 */
export class EntitlementAccessService {
  constructor(
    private readonly subscription: SubscriptionService,
    private readonly featureGate: FeatureGateService,
    private readonly paywallImpressions: PaywallImpressionService,
  ) {}

  async getPlanStatus(userId: string): Promise<PlanStatus> {
    if (areAllFeaturesUnlocked()) return getUnlockedPlanStatus();
    return this.subscription.getPlanStatus(userId);
  }

  async isPro(userId: string): Promise<boolean> {
    if (areAllFeaturesUnlocked()) return true;
    const status = await this.getPlanStatus(userId);
    return status.isPro;
  }

  async canAccessFeature(userId: string, feature: FeatureAccessKey | GateFeature) {
    if (areAllFeaturesUnlocked()) {
      const status = getUnlockedPlanStatus();
      return { allowed: true as const, feature: feature as GateFeature, status };
    }
    const status = await this.getPlanStatus(userId);
    if (feature === 'notes_advanced_ai' || feature === 'notes_semantic_search') {
      return status.isPro
        ? { allowed: true as const, feature: 'notes_advanced_ai' as const, status }
        : {
            allowed: false as const,
            feature: 'notes_advanced_ai' as const,
            upgradeRequired: true as const,
            reason:
              feature === 'notes_semantic_search'
                ? 'Semantic note search is part of Voxa Pro.'
                : 'Advanced AI note tools are part of Voxa Pro.',
            status,
          };
    }
    const gate = feature as GateFeature;
    const result = this.featureGate.canAccessFeature(gate, status);
    return { ...result, status };
  }

  async refresh(profile: UserProfile): Promise<PlanStatus> {
    return this.subscription.syncProfile(profile);
  }

  async restorePurchases(userId: string) {
    trackEvent('restore_started');
    try {
      const result = await this.subscription.restorePurchases(userId);
      trackEvent('restore_completed', { isPro: (await this.isPro(userId)) ? 1 : 0 });
      return result;
    } catch (err) {
      trackEvent('purchase_failed', { stage: 'restore' });
      throw new Error(toFriendlyBillingError(err, 'restore'));
    }
  }

  async shouldShowContextualPaywall(userId: string, force = false): Promise<boolean> {
    if (!isPaywallEnabled()) return false;
    return this.paywallImpressions.canShowPaywall(userId, force);
  }

  async markPaywallShown(userId: string, source: string): Promise<void> {
    await this.paywallImpressions.recordImpression(userId);
    trackEvent('paywall_viewed', { source });
  }
}
