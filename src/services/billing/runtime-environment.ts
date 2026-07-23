import Constants from 'expo-constants';

export type BillingRuntime = {
  isExpoGo: boolean;
  isDevelopmentBuild: boolean;
  supportsNativePurchases: boolean;
  environmentLabel: string;
};

/** True when running inside the Expo Go client (no native IAP). */
export function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

export function isDevelopmentBuild(): boolean {
  return !isExpoGo();
}

export function isTestStoreEnabled(): boolean {
  return process.env.EXPO_PUBLIC_REVENUECAT_TEST_STORE === 'true';
}

export function getBillingRuntime(): BillingRuntime {
  const expoGo = isExpoGo();
  const devBuild = !expoGo;
  const testStore = isTestStoreEnabled();

  return {
    isExpoGo: expoGo,
    isDevelopmentBuild: devBuild,
    supportsNativePurchases: !expoGo || testStore,
    environmentLabel: expoGo ? 'Expo Go' : devBuild ? 'Development build' : 'Production build',
  };
}

export function getPurchasesUnavailableMessage(): string {
  return 'Purchases require the Voxa development build. Install a dev build to subscribe with RevenueCat.';
}
