import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  clearAllLocalVoxaData,
  getVoxaServices,
  resetVoxaServices,
  seedLocalVoxaData,
  VoxaCompanionService,
  VoxaServices,
} from '../services';
import { UserProfile } from '../types';

type VoxaContextValue = {
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  profile: UserProfile | null;
  services: VoxaServices;
  companion: VoxaCompanionService;
  refreshProfile: () => Promise<void>;
  reinitialize: () => Promise<void>;
  resetLocalData: () => Promise<void>;
};

const VoxaContext = createContext<VoxaContextValue | null>(null);

export function VoxaProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState(() => getVoxaServices());
  const companion = useMemo(
    () => new VoxaCompanionService(services.repositories, services.ai),
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
      let currentProfile = await services.repositories.userProfile.getProfile();
      if (!currentProfile) {
        currentProfile = await seedLocalVoxaData(services.repositories);
      }
      setProfile(currentProfile);
      setIsReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize Voxa.');
      setIsReady(false);
    } finally {
      setIsLoading(false);
    }
  }, [services.repositories]);

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
    setIsLoading(true);
    setError(null);
    try {
      await clearAllLocalVoxaData(services.storage);
      const freshServices = resetVoxaServices();
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

  const value = useMemo(
    () => ({
      isReady,
      isLoading,
      error,
      profile,
      services,
      companion,
      refreshProfile,
      reinitialize,
      resetLocalData,
    }),
    [isReady, isLoading, error, profile, services, companion, refreshProfile, reinitialize, resetLocalData],
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
