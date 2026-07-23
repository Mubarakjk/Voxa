import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { hasSupabaseConfig } from '../config/env';
import { recordSyncFailure, recordSyncSuccess } from '../utils/debug-info';
import { authService } from '../services/auth/auth-service';
import { createBackgroundServices, BackgroundServices } from '../services/background/background-services';
import {
  clearAllLocalVoxaData,
  getVoxaServices,
  resetVoxaServices,
  seedLocalVoxaData,
  VoxaCompanionService,
  VoxaServices,
} from '../services';
import { UserProfile } from '../types';
import { validateBillingEnvironment } from '../services/billing/billing-validation';
import { BillingLog } from '../services/billing/billing-logger';

type VoxaContextValue = {
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  profile: UserProfile | null;
  services: VoxaServices;
  companion: VoxaCompanionService;
  background: BackgroundServices;
  refreshProfile: () => Promise<void>;
  reinitialize: () => Promise<void>;
  resetLocalData: () => Promise<void>;
  signOutCleanup: () => Promise<void>;
};

const VoxaContext = createContext<VoxaContextValue | null>(null);

export function VoxaProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState(() => getVoxaServices());
  const background = useMemo(() => createBackgroundServices(services.repositories, services.storage), [services]);
  const companion = useMemo(
    () =>
      new VoxaCompanionService(
        services.repositories,
        services.ai,
        services.memoryEngine,
        services.companionIntelligence,
        {
          subscription: services.subscription,
          featureGate: services.featureGate,
          usageTracking: services.usageTracking,
        },
        services.storage,
      ),
    [services],
  );
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const initialize = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (hasSupabaseConfig()) {
        const authUser = await authService.getAuthUser();
        const cachedProfile = await services.repositories.userProfile.getProfile();
        if (authUser && cachedProfile && cachedProfile.id !== authUser.id) {
          console.warn('[Voxa] Stale local profile cache detected — clearing before cloud sync.');
          await services.subscription.signOutBilling(cachedProfile.id);
          await clearAllLocalVoxaData(services.storage);
        }
      }

      let currentProfile = await services.repositories.userProfile.getProfile();

      if (!currentProfile && hasSupabaseConfig()) {
        const authUser = await authService.getAuthUser();
        if (authUser) {
          currentProfile = await services.repositories.userProfile.createProfile({
            displayName: authUser.displayName,
            email: authUser.email,
          });
        }
      }

      if (!currentProfile && !hasSupabaseConfig()) {
        currentProfile = await seedLocalVoxaData(services.repositories);
      }

      if (!currentProfile) {
        throw new Error('User profile not found. Please sign in again.');
      }

      const billingValidation = validateBillingEnvironment();
      if (!billingValidation.allRequiredOk) {
        const failedLabels = billingValidation.checks.filter((check) => !check.ok).map((check) => check.label);
        BillingLog.configureFailure(`Startup billing validation: ${failedLabels.join(', ')}`);
      } else {
        BillingLog.configureSuccess();
      }

      await services.subscription.syncProfile(currentProfile);
      await services.subscription.refreshUsageCounts(currentProfile.id, services.repositories);
      const syncedProfile = await services.repositories.userProfile.getProfile();

      setProfile(syncedProfile ?? currentProfile);
      setIsReady(true);
      recordSyncSuccess();

      if (currentProfile.onboardingComplete) {
        await background.runStartupTasks(currentProfile.id, syncedProfile ?? currentProfile);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize Voxa.');
      setIsReady(false);
      recordSyncFailure();
    } finally {
      setIsLoading(false);
    }
  }, [services.repositories, services.storage, background]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const refreshProfile = useCallback(async () => {
    const nextProfile = await services.repositories.userProfile.getProfile();
    setProfile(nextProfile);
  }, [services.repositories.userProfile]);

  const reinitialize = useCallback(async () => {
    await initialize();
  }, [initialize]);

  const resetLocalData = useCallback(async () => {
    if (hasSupabaseConfig()) return;
    setIsLoading(true);
    setError(null);
    try {
      await clearAllLocalVoxaData(services.storage);
      const freshServices = resetVoxaServices({ forceLocal: true });
      setServices(freshServices);
      const seededProfile = await seedLocalVoxaData(freshServices.repositories);
      setProfile(seededProfile);
      setIsReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset local data.');
    } finally {
      setIsLoading(false);
    }
  }, [services.storage]);

  const signOutCleanup = useCallback(async () => {
    try {
      if (profile?.id) {
        await services.subscription.signOutBilling(profile.id);
      }
      if (hasSupabaseConfig()) {
        await clearAllLocalVoxaData(services.storage);
      }
    } catch (err) {
      console.warn('[Voxa] Failed to clear local cache on sign out.', err);
    }
    resetVoxaServices();
    setServices(getVoxaServices());
    setProfile(null);
    setIsReady(false);
    setError(null);
  }, [services.storage, services.subscription, profile?.id]);

  const value = useMemo(
    () => ({
      isReady,
      isLoading,
      error,
      profile,
      services,
      companion,
      background,
      refreshProfile,
      reinitialize,
      resetLocalData,
      signOutCleanup,
    }),
    [
      isReady,
      isLoading,
      error,
      profile,
      services,
      companion,
      background,
      refreshProfile,
      reinitialize,
      resetLocalData,
      signOutCleanup,
    ],
  );

  return <VoxaContext.Provider value={value}>{children}</VoxaContext.Provider>;
}

export function useVoxa() {
  const context = useContext(VoxaContext);
  if (!context) {
    throw new Error('useVoxa must be used within VoxaProvider');
  }
  return context;
}
