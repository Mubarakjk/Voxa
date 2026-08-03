import { PlanStatus } from '../types/subscription';

/** Plan status returned when V1 free launch unlocks everything. */
export const FREE_LAUNCH_PLAN_STATUS: PlanStatus = {
  effectivePlan: 'pro',
  isPro: true,
  isTrialActive: false,
  trialDaysLeft: 0,
  subscriptionPlan: 'pro',
  isFoundingMember: false,
  entitlementSource: 'dev_override',
};

export function getUnlockedPlanStatus(overrides?: Partial<PlanStatus>): PlanStatus {
  return { ...FREE_LAUNCH_PLAN_STATUS, ...overrides };
}
