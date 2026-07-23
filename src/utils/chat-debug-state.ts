let lastChatLatencyMs: number | null = null;
let lastChatProvider = 'unknown';
let lastPhotoAnalysisStatus = '—';
let lastMemoryExtractionStatus = '—';
let lastRoutineSyncStatus = '—';

export function recordChatLatency(ms: number, provider: string) {
  lastChatLatencyMs = ms;
  lastChatProvider = provider;
}

export function recordPhotoAnalysisStatus(status: string) {
  lastPhotoAnalysisStatus = status;
}

export function recordMemoryExtractionStatus(status: string) {
  lastMemoryExtractionStatus = status;
}

export function recordRoutineSyncStatus(status: string) {
  lastRoutineSyncStatus = status;
}

export function getChatDebugSnapshot() {
  return {
    lastChatLatencyMs,
    lastChatProvider,
    lastPhotoAnalysisStatus,
    lastMemoryExtractionStatus,
    lastRoutineSyncStatus,
    experimentalFeatures: process.env.EXPO_PUBLIC_EXPERIMENTAL_FEATURES === 'true',
  };
}
