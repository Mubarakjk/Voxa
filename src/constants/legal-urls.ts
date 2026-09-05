/**
 * Public legal URLs / support contact for App Store and in-app links.
 *
 * Supply via EAS env once GitHub Pages (or another free host) is live.
 * Do NOT fall back to voxa.app — that domain is not a controlled Voxa site.
 */
export const LEGAL_URLS = {
  privacyPolicy: process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL?.trim() || '',
  termsOfService: process.env.EXPO_PUBLIC_TERMS_OF_SERVICE_URL?.trim() || '',
  supportEmail:
    process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() || 'mujimoh2008@gmail.com',
} as const;

function isUsablePublicHttpsUrl(url: string): boolean {
  if (!url.startsWith('https://')) return false;
  const lower = url.toLowerCase();
  if (lower.includes('voxa.app')) return false;
  if (lower.includes('example.com')) return false;
  if (lower.includes('localhost')) return false;
  return true;
}

/** True only when production-ready public Privacy + Terms HTTPS URLs are configured. */
export function legalUrlsConfigured(): boolean {
  return (
    isUsablePublicHttpsUrl(LEGAL_URLS.privacyPolicy) &&
    isUsablePublicHttpsUrl(LEGAL_URLS.termsOfService)
  );
}

/** True when a monitored support inbox (not a dead @voxa.app placeholder) is configured. */
export function isSupportEmailConfigured(): boolean {
  const email = LEGAL_URLS.supportEmail.trim().toLowerCase();
  if (!email.includes('@') || email.startsWith('@') || email.endsWith('@')) return false;
  if (email.endsWith('@voxa.app')) return false;
  if (email.includes('example.com')) return false;
  return true;
}
