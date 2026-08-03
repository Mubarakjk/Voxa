/**
 * Public legal URLs for App Store / paywall.
 * Host these pages before submission — placeholders are a release blocker.
 */
export const LEGAL_URLS = {
  privacyPolicy:
    process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL?.trim() || 'https://voxa.app/privacy',
  termsOfService:
    process.env.EXPO_PUBLIC_TERMS_OF_SERVICE_URL?.trim() || 'https://voxa.app/terms',
  supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() || 'support@voxa.app',
} as const;

export function legalUrlsConfigured(): boolean {
  const privacy = LEGAL_URLS.privacyPolicy;
  const terms = LEGAL_URLS.termsOfService;
  return (
    privacy.startsWith('https://') &&
    terms.startsWith('https://') &&
    !privacy.includes('example.com') &&
    !terms.includes('example.com')
  );
}
