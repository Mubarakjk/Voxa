/**
 * Privacy-conscious analytics — never attach chat text, food descriptions,
 * precise location, memories, note bodies, receipts, or payment payloads.
 */

type AnalyticsProps = Record<string, string | number | boolean | undefined>;

const SENSITIVE_KEY =
  /(token|receipt|apple.?id|memory|message|chat|food|calorie|location|lat|lng|password|secret|note_body|content|customer.?info)/i;

function sanitize(props?: AnalyticsProps): AnalyticsProps | undefined {
  if (!props) return undefined;
  const out: AnalyticsProps = {};
  for (const [key, value] of Object.entries(props)) {
    if (SENSITIVE_KEY.test(key)) continue;
    if (value === undefined) continue;
    out[key] = value;
  }
  return out;
}

export type AnalyticsEventName =
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'onboarding_step_completed'
  | 'home_opened'
  | 'chat_started'
  | 'message_sent'
  | 'reflection_completed'
  | 'weather_enabled'
  | 'calorie_tracker_enabled'
  | 'food_entry_added'
  | 'game_started'
  | 'game_completed'
  | 'subscription_screen_opened'
  | 'voice_preview_started'
  | 'voice_selected'
  | 'note_created'
  | 'note_edited'
  | 'note_ai_action_started'
  | 'note_ai_action_completed'
  | 'paywall_opened'
  | 'paywall_viewed'
  | 'paywall_source'
  | 'paywall_dismissed'
  | 'package_selected'
  | 'purchase_started'
  | 'purchase_succeeded'
  | 'purchase_completed'
  | 'purchase_cancelled'
  | 'purchase_failed'
  | 'restore_started'
  | 'restore_succeeded'
  | 'restore_no_entitlement'
  | 'restore_failed'
  | 'restore_completed'
  | 'pro_feature_used'
  | 'free_limit_reached'
  | 'error_state_reached';

/** In-memory ring for tests / debug — never stores content or receipts. */
const recentBillingEvents: Array<{ name: AnalyticsEventName; props?: AnalyticsProps }> = [];
const BILLING_EVENT_CAP = 40;

export function trackEvent(name: AnalyticsEventName, props?: AnalyticsProps) {
  const clean = sanitize(props);
  if (
    name.startsWith('paywall_') ||
    name.startsWith('purchase_') ||
    name.startsWith('restore_') ||
    name === 'package_selected' ||
    name === 'subscription_screen_opened' ||
    name === 'free_limit_reached'
  ) {
    recentBillingEvents.push({ name, props: clean });
    if (recentBillingEvents.length > BILLING_EVENT_CAP) {
      recentBillingEvents.shift();
    }
  }
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    // eslint-disable-next-line no-console
    console.log('[analytics]', name, clean);
  }
}

export function getRecentBillingAnalyticsEvents() {
  return [...recentBillingEvents];
}

export function clearRecentBillingAnalyticsEvents() {
  recentBillingEvents.length = 0;
}

export function trackErrorState(screen: string, code: string) {
  trackEvent('error_state_reached', { screen, code });
}
