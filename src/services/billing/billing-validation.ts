import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { getAiGatewayUrlFromEnv, isAiGatewayConfiguredFromEnv } from '../../config/ai-gateway-env';
import { isReleaseAiEnvironment } from '../../config/ai-routing';
import { hasSupabaseConfig, getSupabaseUrl } from '../../config/env';
import {
  getRevenueCatAndroidApiKey,
  getRevenueCatAnnualProductId,
  getRevenueCatEntitlementId,
  getRevenueCatIosApiKey,
  getRevenueCatMonthlyProductId,
  getRevenueCatOfferingId,
  getRevenueCatApiKeyForPlatform,
  hasRevenueCatConfig,
} from '../../config/revenuecat-env';
import { VOXA_PRICING } from '../../constants/voxa-pricing';
import { getBillingRuntime } from './runtime-environment';
import { maskSecret } from './billing-logger';

export type BillingValidationCheck = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
};

export type BillingValidationReport = {
  checkedAt: string;
  runtime: string;
  allRequiredOk: boolean;
  checks: BillingValidationCheck[];
};

const EXPECTED_IOS_BUNDLE = 'app.voxa.companion';
const EXPECTED_ANDROID_PACKAGE = 'app.voxa.companion';

export function getConfiguredPlatformKeyPrefix(): string {
  return maskSecret(getRevenueCatApiKeyForPlatform());
}

export function getAiGatewayUrl(): string | undefined {
  return getAiGatewayUrlFromEnv();
}

export function isAiGatewayConfigured(): boolean {
  return isAiGatewayConfiguredFromEnv();
}

export function shouldPreferAiGateway(): boolean {
  return isReleaseAiEnvironment();
}

export function validateBillingEnvironment(): BillingValidationReport {
  const runtime = getBillingRuntime();
  const expoConfig = Constants.expoConfig;
  const iosBundle = expoConfig?.ios?.bundleIdentifier;
  const androidPackage = expoConfig?.android?.package;
  const easProjectId = expoConfig?.extra?.eas?.projectId as string | undefined;
  const platformKey = Platform.OS === 'ios' ? getRevenueCatIosApiKey() : getRevenueCatAndroidApiKey();

  const checks: BillingValidationCheck[] = [
    {
      id: 'rc_ios_key',
      label: 'RevenueCat iOS key',
      ok: Platform.OS !== 'ios' || Boolean(getRevenueCatIosApiKey()),
      detail: Platform.OS === 'ios' ? maskSecret(getRevenueCatIosApiKey()) : 'n/a (not iOS)',
    },
    {
      id: 'rc_android_key',
      label: 'RevenueCat Android key',
      ok: Platform.OS !== 'android' || Boolean(getRevenueCatAndroidApiKey()),
      detail: Platform.OS === 'android' ? maskSecret(getRevenueCatAndroidApiKey()) : 'n/a (not Android)',
    },
    {
      id: 'rc_platform_key',
      label: 'Platform SDK key selected',
      ok: !runtime.supportsNativePurchases || hasRevenueCatConfig(),
      detail: maskSecret(platformKey),
    },
    {
      id: 'rc_entitlement',
      label: 'Entitlement ID',
      ok: getRevenueCatEntitlementId() === VOXA_PRICING.entitlementId,
      detail: getRevenueCatEntitlementId(),
    },
    {
      id: 'rc_offering',
      label: 'Offering ID',
      ok: Boolean(getRevenueCatOfferingId()),
      detail: getRevenueCatOfferingId(),
    },
    {
      id: 'rc_product_monthly',
      label: 'Monthly product ID',
      ok: Boolean(getRevenueCatMonthlyProductId()),
      detail: getRevenueCatMonthlyProductId(),
    },
    {
      id: 'rc_product_annual',
      label: 'Annual product ID',
      ok: Boolean(getRevenueCatAnnualProductId()),
      detail: getRevenueCatAnnualProductId(),
    },
    {
      id: 'supabase',
      label: 'Supabase URL + anon key',
      ok: hasSupabaseConfig(),
      detail: hasSupabaseConfig() ? maskSecret(getSupabaseUrl()) : 'not configured',
    },
    {
      id: 'eas_project',
      label: 'EAS project ID',
      ok: Boolean(easProjectId && easProjectId !== 'replace-with-eas-project-id'),
      detail: easProjectId && easProjectId !== 'replace-with-eas-project-id' ? maskSecret(easProjectId) : 'placeholder',
    },
    {
      id: 'ios_bundle',
      label: 'iOS bundle ID',
      ok: iosBundle === EXPECTED_IOS_BUNDLE,
      detail: iosBundle ?? 'missing',
    },
    {
      id: 'android_package',
      label: 'Android package',
      ok: androidPackage === EXPECTED_ANDROID_PACKAGE,
      detail: androidPackage ?? 'missing',
    },
    {
      id: 'ai_gateway',
      label: 'AI gateway URL',
      ok: !isReleaseAiEnvironment() || isAiGatewayConfigured(),
      detail: getAiGatewayUrl()
        ? maskSecret(getAiGatewayUrl())
        : isReleaseAiEnvironment()
          ? 'required in preview/production'
          : 'optional in development',
    },
  ];

  const requiredForPurchases = checks.filter((check) =>
    [
      'rc_platform_key',
      'rc_entitlement',
      'rc_offering',
      'rc_product_monthly',
      'rc_product_annual',
      'ios_bundle',
      'android_package',
    ].includes(check.id),
  );

  return {
    checkedAt: new Date().toISOString(),
    runtime: runtime.environmentLabel,
    allRequiredOk: requiredForPurchases.every((check) => check.ok),
    checks,
  };
}

export function validateOfferingPackages(offerings: {
  source: 'store' | 'fallback';
  monthly?: { productId: string };
  annual?: { productId: string };
}): { monthlyValid: boolean; annualValid: boolean; setupMessage?: string } {
  if (offerings.source === 'fallback') {
    return {
      monthlyValid: false,
      annualValid: false,
      setupMessage: 'Showing development fallback prices. Connect a dev build and store products for real purchases.',
    };
  }

  const monthlyId = getRevenueCatMonthlyProductId();
  const annualId = getRevenueCatAnnualProductId();
  const monthlyValid = offerings.monthly?.productId === monthlyId;
  const annualValid = offerings.annual?.productId === annualId;

  if (!monthlyValid || !annualValid) {
    const missing = [!monthlyValid ? monthlyId : null, !annualValid ? annualId : null]
      .filter(Boolean)
      .join(', ');
    return {
      monthlyValid,
      annualValid,
      setupMessage: `Missing RevenueCat packages for: ${missing}. Check offering "${getRevenueCatOfferingId()}" in the RevenueCat dashboard.`,
    };
  }

  return { monthlyValid, annualValid };
}
