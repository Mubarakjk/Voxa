import { useCallback, useEffect, useState } from 'react';

import { areAllFeaturesUnlocked } from '../config/launch-mode';
import { getUnlockedPlanStatus } from '../constants/free-launch-plan-status';
import { useVoxa } from '../context/voxa-context';
import { PlanStatus } from '../types/subscription';

/** Live Pro/plan status — refreshes on entitlement changes (purchase, restore, RC listener, expiry). */
export function usePlanStatus() {
  const { profile, services } = useVoxa();
  const [planStatus, setPlanStatus] = useState<PlanStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!profile?.id) {
      setPlanStatus(null);
      setLoading(false);
      return;
    }
    if (areAllFeaturesUnlocked()) {
      setPlanStatus(getUnlockedPlanStatus());
      setLoading(false);
      return;
    }
    try {
      const next = await services.billingService.getPlanStatus(profile.id);
      setPlanStatus(next);
    } finally {
      setLoading(false);
    }
  }, [profile?.id, services.billingService]);

  useEffect(() => {
    void reload();
    if (!profile?.id) return;
    return services.billingService.subscribeEntitlement((userId) => {
      if (userId === profile.id) void reload();
    });
  }, [profile?.id, reload, services.billingService]);

  return {
    planStatus,
    isPro: areAllFeaturesUnlocked() ? true : Boolean(planStatus?.isPro),
    loading,
    reload,
  };
}
