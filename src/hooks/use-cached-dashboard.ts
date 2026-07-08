import { useCallback, useRef, useState } from 'react';

import { HomeDashboardData } from '../services/voxa-companion-service';

const CACHE_TTL_MS = 45_000;

type CacheEntry = {
  data: HomeDashboardData;
  fetchedAt: number;
  userId: string;
};

let globalCache: CacheEntry | null = null;

export function useCachedDashboard(
  userId: string | undefined,
  fetcher: (id: string) => Promise<HomeDashboardData>,
) {
  const [dashboard, setDashboard] = useState<HomeDashboardData | null>(() =>
    globalCache && globalCache.userId === userId && Date.now() - globalCache.fetchedAt < CACHE_TTL_MS
      ? globalCache.data
      : null,
  );
  const [isLoading, setIsLoading] = useState(!dashboard);
  const inflight = useRef<Promise<HomeDashboardData> | null>(null);

  const load = useCallback(
    async (force = false) => {
      if (!userId) return null;

      if (
        !force &&
        globalCache &&
        globalCache.userId === userId &&
        Date.now() - globalCache.fetchedAt < CACHE_TTL_MS
      ) {
        setDashboard(globalCache.data);
        setIsLoading(false);
        return globalCache.data;
      }

      if (inflight.current && !force) {
        return inflight.current;
      }

      setIsLoading(true);
      const task = fetcher(userId).then((data) => {
        globalCache = { data, fetchedAt: Date.now(), userId };
        setDashboard(data);
        setIsLoading(false);
        inflight.current = null;
        return data;
      });

      inflight.current = task;
      return task;
    },
    [userId, fetcher],
  );

  const invalidate = useCallback(() => {
    globalCache = null;
  }, []);

  return { dashboard, isLoading, load, invalidate };
}

export function invalidateDashboardCache() {
  globalCache = null;
}
