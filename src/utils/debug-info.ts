import { hasOpenAIApiKey, hasSupabaseConfig, getDataSourceMode, hasAudDApiToken, hasACRCloudConfig } from '../config/env';
import { hasRevenueCatConfig } from '../config/revenuecat-env';
import { PRICING_CONFIG } from '../constants/pricing';
import { getAccentById } from '../constants/voice-accents';
import { getSpeakingStyleById } from '../constants/voice-speaking-styles';
import { getAIProviderInfo } from '../services/ai/create-ai-service';
import { authService } from '../services/auth/auth-service';
import { getMediaPermissions } from '../services/attachments/attachment-permissions';
import {
  getLastAttachmentUploadStatus,
  getStorageBucketStatus,
} from '../services/attachments/attachment-storage-service';
import { VoxaServices } from '../services/contracts';
import { getMusicRecognitionService } from '../services/music/music-recognition-service';
import { getMusicDebugSnapshot } from '../services/music/music-debug-state';
import { resolveVoiceIdentity } from '../services/voice/voice-identity-resolver';
import { createRealtimeVoiceService } from '../services/voice/realtime-voice-service';
import { getVoiceDebugSnapshot } from '../services/voice/voice-debug-state';
import { UserProfile } from '../types';
import { getChatSaveSnapshot } from './chat-save-status';
import { getChatDebugSnapshot } from './chat-debug-state';
import { getVoiceNoteDebugSnapshot } from './voice-note-debug-state';

export type DebugPanelInfo = {
  supabaseConnected: boolean;
  openAIConnected: boolean;
  audDConfigured: boolean;
  authUserId: string;
  storageMode: string;
  aiProvider: string;
  lastSyncStatus: string;
  lastChatSaveStatus: string;
  idMode: string;
  microphonePermission: string;
  cameraPermission: string;
  mediaLibraryPermission: string;
  storageBucketStatus: string;
  lastAttachmentUpload: string;
  plan: string;
  trialStatus: string;
  usageSummary: string;
  remainingLimits: string;
  foundingMemberFlag: string;
  revenueCatConfigured: string;
  billingProvider: string;
  selectedVoice: string;
  selectedAccent: string;
  selectedGender: string;
  selectedSpeakingStyle: string;
  selectedSpeed: string;
  voiceProvider: string;
  voicePreviewProvider: string;
  openAiTtsStatus: string;
  realtimeReady: string;
  musicProvider: string;
  lastVoiceError: string;
  recorderActive: string;
  voiceCallState: string;
  orbState: string;
  orbMood: string;
  sttProvider: string;
  ttsProvider: string;
  lastOpenAiRequest: string;
  openAiLatency: string;
  lastAudDRequest: string;
  lastAudDStatus: string;
  relationshipScore: string;
  aiResponseTime: string;
  musicLastStep: string;
  musicLastError: string;
  musicLastResponse: string;
  experimentalFeatures: string;
  lastChatLatency: string;
  chatProvider: string;
  lastPhotoAnalysisStatus: string;
  routineSyncStatus: string;
  memoryExtractionStatus: string;
  voiceNoteDuration: string;
  voiceNoteUri: string;
  voiceNoteFileSize: string;
  voiceNoteTranscription: string;
  voiceNoteUpload: string;
  voiceNoteAudioError: string;
};

let lastSyncAt: string | null = null;
let lastSyncOk = true;

export function recordSyncSuccess() {
  lastSyncAt = new Date().toISOString();
  lastSyncOk = true;
}

export function recordSyncFailure() {
  lastSyncAt = new Date().toISOString();
  lastSyncOk = false;
}

export async function getDebugPanelInfo(
  profile: UserProfile | null,
  services?: VoxaServices,
): Promise<DebugPanelInfo> {
  const authUser = hasSupabaseConfig() ? await authService.getAuthUser() : null;
  const ai = getAIProviderInfo();
  const permissions = await getMediaPermissions();
  const storageBucketStatus = await getStorageBucketStatus();
  const realtime = createRealtimeVoiceService();
  const voiceDebug = getVoiceDebugSnapshot();
  const chatSave = getChatSaveSnapshot();
  const chatDebug = getChatDebugSnapshot();
  const voiceNoteDebug = getVoiceNoteDebugSnapshot();
  const musicService = getMusicRecognitionService();
  const musicDebug = getMusicDebugSnapshot();

  let lastSyncStatus = 'Not synced yet';
  if (lastSyncAt) {
    lastSyncStatus = lastSyncOk
      ? `OK · ${new Date(lastSyncAt).toLocaleTimeString()}`
      : `Failed · ${new Date(lastSyncAt).toLocaleTimeString()}`;
  }

  let plan = 'Free';
  let trialStatus = 'Not started';
  let usageSummary = '—';
  let remainingLimits = '—';

  if (profile && services) {
    const status = await services.subscription.buildPlanStatus(profile.id, profile.subscription);
    plan = status.isPro ? (status.isTrialActive ? 'Pro (trial)' : 'Pro') : 'Free';
    trialStatus = status.isTrialActive
      ? `Active · ${status.trialDaysLeft}d left`
      : profile.subscription?.trialUsed
        ? 'Used'
        : 'Available';

    const usage = await services.usageTracking.getUsage(profile.id);
    usageSummary = `AI ${usage.daily.aiMessages}/${usage.monthly.aiMessages} · Voice ${usage.daily.voiceMinutes}m · Images ${usage.daily.imageUploads}`;
    const remaining = services.featureGate.getRemainingLimits(status, usage);
    remainingLimits = `AI ${remaining.aiMessagesDaily} · Images ${remaining.imageUploadsDaily} · Goals ${remaining.goals}`;
  }

  const voiceIdentity = profile ? resolveVoiceIdentity(profile) : null;
  const accent = voiceIdentity ? getAccentById(voiceIdentity.accentId) : undefined;
  const style = voiceIdentity ? getSpeakingStyleById(voiceIdentity.speakingStyle) : undefined;

  const chatSaveLabel = chatSave.at
    ? `${chatSave.status} · ${new Date(chatSave.at).toLocaleTimeString()}`
    : chatSave.status;

  return {
    supabaseConnected: hasSupabaseConfig(),
    openAIConnected: hasOpenAIApiKey(),
    audDConfigured: hasAudDApiToken(),
    authUserId: authUser?.id ?? profile?.id ?? 'Local only',
    storageMode: getDataSourceMode(),
    aiProvider: ai.label,
    lastSyncStatus,
    lastChatSaveStatus: chatSaveLabel,
    idMode: 'UUID',
    microphonePermission: permissions.microphone,
    cameraPermission: permissions.camera,
    mediaLibraryPermission: permissions.mediaLibrary,
    storageBucketStatus,
    lastAttachmentUpload: getLastAttachmentUploadStatus(),
    plan,
    trialStatus,
    usageSummary,
    remainingLimits,
    foundingMemberFlag: 'Deprecated',
    revenueCatConfigured: hasRevenueCatConfig() ? 'Yes' : 'No',
    billingProvider: 'revenuecat',
    selectedVoice: voiceIdentity ? `${voiceIdentity.gender} · ${voiceIdentity.ageStyle}` : '—',
    selectedAccent: accent?.label ?? '—',
    selectedGender: voiceIdentity?.gender ?? '—',
    selectedSpeakingStyle: style?.label ?? '—',
    selectedSpeed: voiceIdentity?.speechSpeed ?? '—',
    voiceProvider: hasOpenAIApiKey() ? 'OpenAI TTS' : 'expo-speech',
    voicePreviewProvider: hasOpenAIApiKey() ? 'OpenAI TTS' : 'expo-speech',
    openAiTtsStatus: hasOpenAIApiKey() ? 'Connected' : 'Not configured',
    realtimeReady: realtime.isSupported() ? 'Yes' : 'Stub only',
    musicProvider: musicService.getActiveProvider(),
    lastVoiceError: voiceDebug.lastVoiceError,
    recorderActive: voiceDebug.recorderActive ? 'Yes' : 'No',
    voiceCallState: voiceDebug.voiceCallState,
    orbState: voiceDebug.orbState,
    orbMood: voiceDebug.orbMood,
    sttProvider: voiceDebug.sttProvider,
    ttsProvider: voiceDebug.ttsProvider,
    lastOpenAiRequest: voiceDebug.lastOpenAiRequestAt,
    openAiLatency: voiceDebug.lastOpenAiLatencyMs,
    lastAudDRequest: voiceDebug.lastAudDRequestAt,
    lastAudDStatus: voiceDebug.lastAudDStatus,
    relationshipScore: voiceDebug.relationshipScore,
    aiResponseTime: voiceDebug.aiResponseTimeMs,
    musicLastStep: musicDebug.step,
    musicLastError: musicDebug.lastError,
    musicLastResponse: musicDebug.lastResponseStatus,
    experimentalFeatures: chatDebug.experimentalFeatures ? 'On' : 'Off',
    lastChatLatency:
      chatDebug.lastChatLatencyMs !== null ? `${chatDebug.lastChatLatencyMs}ms` : '—',
    chatProvider: chatDebug.lastChatProvider,
    lastPhotoAnalysisStatus: chatDebug.lastPhotoAnalysisStatus,
    routineSyncStatus: chatDebug.lastRoutineSyncStatus,
    memoryExtractionStatus: chatDebug.lastMemoryExtractionStatus,
    voiceNoteDuration:
      voiceNoteDebug.durationMs > 0 ? `${Math.round(voiceNoteDebug.durationMs / 1000)}s` : '—',
    voiceNoteUri: voiceNoteDebug.uriExists ? 'saved' : '—',
    voiceNoteFileSize:
      voiceNoteDebug.fileSizeBytes !== null ? `${voiceNoteDebug.fileSizeBytes} B` : '—',
    voiceNoteTranscription: voiceNoteDebug.lastTranscriptionStatus,
    voiceNoteUpload: voiceNoteDebug.lastUploadStatus,
    voiceNoteAudioError: voiceNoteDebug.lastError ?? 'None',
  };
}

export function getTrialDaysLabel() {
  return PRICING_CONFIG.trialDays;
}

export function getMusicConfigSummary() {
  if (hasAudDApiToken()) return 'AudD configured';
  if (hasACRCloudConfig()) return 'ACRCloud configured';
  return 'Not configured';
}
