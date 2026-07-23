/**
 * Privacy-conscious analytics — never attach chat text, food descriptions,
 * precise location, memories, or payment payloads.
 */

type AnalyticsProps = Record<string, string | number | boolean | undefined>;

const SENSITIVE_KEY = /(token|memory|message|chat|food|calorie|location|lat|lng|password|secret)/i;

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
  | 'onboarding_completed'
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
  | 'purchase_completed'
  | 'error_state_reached';

export function trackEvent(name: AnalyticsEventName, props?: AnalyticsProps) {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[analytics]', name, sanitize(props));
    return;
  }
  // Production: wire to your provider (e.g. PostHog/Amplitude) without sensitive props.
  void name;
  void sanitize(props);
}

export function trackErrorState(screen: string, code: string) {
  trackEvent('error_state_reached', { screen, code });
}
