import { Platform } from 'react-native';

import { VOXA_PRICING } from '../constants/voxa-pricing';

export {
  getRevenueCatAnnualProductId,
  getRevenueCatMonthlyProductId,
  getRevenueCatProductIds,
} from './revenuecat-product-ids';

export function getRevenueCatIosApiKey(): string | undefined {
  return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() || undefined;
}

export function getRevenueCatAndroidApiKey(): string | undefined {
  return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim() || undefined;
}

export function getRevenueCatEntitlementId(): string {
  return process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID?.trim() || VOXA_PRICING.entitlementId;
}

export function getRevenueCatOfferingId(): string {
  return process.env.EXPO_PUBLIC_REVENUECAT_OFFERING_ID?.trim() || VOXA_PRICING.offeringId;
}

export function getRevenueCatApiKeyForPlatform(): string | undefined {
  if (Platform.OS === 'ios') return getRevenueCatIosApiKey();
  if (Platform.OS === 'android') return getRevenueCatAndroidApiKey();
  return undefined;
}

export function hasRevenueCatConfig(): boolean {
  return Boolean(getRevenueCatApiKeyForPlatform());
}
