import { STORAGE_KEYS } from '../../constants/storage-keys';
import { IStorageService } from '../contracts';

export type SubscriptionAnalyticsEvent =
  | 'onboarding_completed'
  | 'first_chat_sent'
  | 'first_memory_saved'
  | 'first_voice_note_sent'
  | 'paywall_viewed'
  | 'purchase_started'
  | 'purchase_completed'
  | 'purchase_cancelled'
  | 'purchase_failed'
  | 'restore_started'
  | 'restore_completed'
  | 'subscription_expired'
  | 'pro_feature_opened'
  | 'free_limit_reached'
  | 'trial_started'
  | 'trial_converted';

type AnalyticsPayload = {
  event: SubscriptionAnalyticsEvent;
  at: string;
  source?: string;
  feature?: string;
  productId?: string;
};

export class SubscriptionAnalyticsService {
  constructor(private readonly storage: IStorageService) {}

  private get optOutKey() {
    return `${STORAGE_KEYS.subscriptionAnalytics}:opt_out`;
  }

  async isOptedOut(): Promise<boolean> {
    return Boolean(await this.storage.getItem<boolean>(this.optOutKey));
  }

  async setOptOut(optOut: boolean): Promise<void> {
    await this.storage.setItem(this.optOutKey, optOut);
  }

  async track(event: SubscriptionAnalyticsEvent, meta?: Omit<AnalyticsPayload, 'event' | 'at'>) {
    if (await this.isOptedOut()) return;

    const payload: AnalyticsPayload = {
      event,
      at: new Date().toISOString(),
      ...meta,
    };

    console.info('[Voxa Analytics]', payload.event, {
      source: payload.source,
      feature: payload.feature,
      productId: payload.productId,
    });

    const key = `${STORAGE_KEYS.subscriptionAnalytics}:events`;
    const existing = (await this.storage.getItem<AnalyticsPayload[]>(key)) ?? [];
    existing.push(payload);
    await this.storage.setItem(key, existing.slice(-100));
  }

  async getRecentEvents(limit = 20): Promise<AnalyticsPayload[]> {
    const key = `${STORAGE_KEYS.subscriptionAnalytics}:events`;
    const existing = (await this.storage.getItem<AnalyticsPayload[]>(key)) ?? [];
    return existing.slice(-limit);
  }
}
