import { getFeatureStatus, isFeatureVisible } from '../../config/feature-status';
import { isVoiceNotesEnabled } from '../../config/release-voice';
import { GateResult } from '../../types/subscription';
import { FeatureGateService } from '../billing/feature-gate-service';
import { SubscriptionService } from '../billing/subscription-service';
import { UsageTrackingService } from '../billing/usage-tracking-service';
import { getVoiceNoteDebugSnapshot, patchVoiceNoteDebug } from './voice-note-debug-state';

export async function checkVoiceNoteGate(input: {
  userId: string;
  subscription: SubscriptionService;
  featureGate: FeatureGateService;
  usageTracking: UsageTrackingService;
}): Promise<GateResult & { dailyUsed?: number; dailyLimit?: number }> {
  if (!isVoiceNotesEnabled()) {
    return {
      allowed: false,
      feature: 'voice_note',
      reason: 'feature_disabled',
    };
  }
  const status = await input.subscription.getPlanStatus(input.userId);
  const usage = await input.usageTracking.getUsage(input.userId);
  const result = input.featureGate.canAccessFeature('voice_note', status, usage);
  const limits = input.featureGate.resolveLimits(status);
  patchVoiceNoteDebug({
    dailyUsageCount: usage.daily.voiceNotes,
    gateAllowed: result.allowed,
  });
  return {
    ...result,
    dailyUsed: usage.daily.voiceNotes,
    dailyLimit: limits.voiceNotesDaily,
  };
}

export function isVoiceNoteUiVisible(): boolean {
  return isVoiceNotesEnabled() && isFeatureVisible('voiceNote');
}

export function getVoiceNoteFeatureDiagnostics() {
  const snap = getVoiceNoteDebugSnapshot();
  return {
    featureStatus: getFeatureStatus('voiceNote'),
    uiVisible: isVoiceNoteUiVisible(),
    gateAllowed: snap.gateAllowed,
    dailyUsageCount: snap.dailyUsageCount,
    recorderState: snap.state,
    permissionGranted: snap.permissionGranted,
    lastError: snap.lastError,
    serviceLoaded: true,
  };
}
