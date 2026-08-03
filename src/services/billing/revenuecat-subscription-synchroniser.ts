import { hasSupabaseConfig } from '../../config/env';
import { getRevenueCatEntitlementId } from '../../config/revenuecat-env';
import { getSupabaseClient } from '../supabase/client';
import { UserProfile } from '../../types';
import { ISubscriptionRepository } from './billing-contracts';
import { EntitlementSnapshot, SubscriptionMirrorRecord } from './billing-types';
import { BillingLog } from './billing-logger';
import { entitlementToSubscriptionSnapshot } from './legacy-subscription-migration';
import { RevenueCatPurchaseManager } from './revenuecat-purchase-manager';
import { SubscriptionEntitlementService } from './subscription-entitlement-service';

export class RevenueCatSubscriptionSynchroniser {
  constructor(
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly entitlementService: SubscriptionEntitlementService,
    private readonly purchaseManager: RevenueCatPurchaseManager,
  ) {}

  async syncFromCustomerInfo(userId: string, entitlement: EntitlementSnapshot): Promise<void> {
    await this.entitlementService.setEntitlement(userId, entitlement);

    const current = await this.subscriptionRepo.getSubscription(userId);
    const mirrored = entitlementToSubscriptionSnapshot(entitlement, current);
    await this.subscriptionRepo.saveSubscription(userId, mirrored);

    if (hasSupabaseConfig()) {
      await this.mirrorToSupabase(userId, entitlement);
    }
  }

  async refreshAndSync(userId: string): Promise<EntitlementSnapshot> {
    const snapshot = await this.purchaseManager.refreshCustomerInfo(userId);
    await this.syncFromCustomerInfo(userId, snapshot.entitlement);
    return snapshot.entitlement;
  }

  async linkAuthenticatedUser(userId: string): Promise<EntitlementSnapshot> {
    if (!this.purchaseManager.isAvailable()) {
      return this.entitlementService.getCachedEntitlement(userId);
    }

    const snapshot = await this.purchaseManager.logIn(userId);
    await this.syncFromCustomerInfo(userId, snapshot.entitlement);
    return snapshot.entitlement;
  }

  async clearForSignOut(userId: string): Promise<void> {
    await this.entitlementService.clearEntitlement(userId);
    await this.purchaseManager.logOut();
  }

  private async mirrorToSupabase(userId: string, entitlement: EntitlementSnapshot): Promise<void> {
    try {
      const record: SubscriptionMirrorRecord = {
        user_id: userId,
        revenuecat_app_user_id: entitlement.revenueCatAppUserId ?? userId,
        entitlement_id: entitlement.entitlementId ?? getRevenueCatEntitlementId(),
        product_id: entitlement.productId,
        platform: undefined,
        status: entitlement.isPro
          ? entitlement.isTrialActive
            ? 'trialing'
            : entitlement.billingIssue
              ? 'billing_issue'
              : 'active'
          : entitlement.refunded
            ? 'revoked'
            : 'expired',
        purchase_date: entitlement.purchaseDate,
        expiration_date: entitlement.expiresAt,
        trial_end: entitlement.trialEnd,
        will_renew: entitlement.willRenew,
        store_environment: entitlement.storeEnvironment,
        updated_at: new Date().toISOString(),
      };

      const client = getSupabaseClient();
      await client.from('subscriptions').upsert(record, { onConflict: 'user_id' });
    } catch (err) {
      console.warn('[Voxa Billing] Supabase subscription mirror failed.', err);
    }
  }

  async getMirrorStatus(userId: string): Promise<string> {
    if (!hasSupabaseConfig()) return 'Local-only mode';
    try {
      const { data, error } = await getSupabaseClient()
        .from('subscriptions')
        .select('status, updated_at')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) return `Mirror error: ${error.message}`;
      if (!data) return 'No Supabase mirror yet';
      BillingLog.webhookMirrorStatus(`${data.status} · ${data.updated_at ?? 'unknown'}`);
      return `${data.status} · ${data.updated_at ?? 'unknown'}`;
    } catch (err) {
      return err instanceof Error ? err.message : 'Mirror unavailable';
    }
  }

  async getWebhookMirrorDetails(userId: string): Promise<{
    status: string;
    updatedAt?: string;
    lastEventId?: string;
  }> {
    if (!hasSupabaseConfig()) {
      return { status: 'local-only' };
    }
    try {
      const { data, error } = await getSupabaseClient()
        .from('subscriptions')
        .select('status, updated_at, last_event_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (error || !data) return { status: error?.message ?? 'none' };
      return {
        status: data.status,
        updatedAt: data.updated_at ?? undefined,
        lastEventId: data.last_event_id ?? undefined,
      };
    } catch (err) {
      return { status: err instanceof Error ? err.message : 'unavailable' };
    }
  }

  async runAccountIsolationSelfCheck(currentUserId: string): Promise<{
    ok: boolean;
    detail: string;
  }> {
    const cachedUserId = this.entitlementService.getCachedUserId();
    if (cachedUserId && cachedUserId !== currentUserId) {
      return {
        ok: false,
        detail: `Cached entitlement belongs to ${cachedUserId.slice(0, 8)}…, not current user.`,
      };
    }
    return { ok: true, detail: 'Cached entitlement matches current app user ID.' };
  }
}

export async function bootstrapBillingForProfile(
  billingService: import('./billing-service').BillingService,
  profile: UserProfile,
): Promise<void> {
  await billingService.configureForUser(profile.id);
}
