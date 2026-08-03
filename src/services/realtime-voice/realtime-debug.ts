const PREFIX = '[RealtimeVoice]';

export function realtimeLog(event: string, detail?: Record<string, unknown>) {
  if (!__DEV__) return;
  if (detail) {
    // Never pass secrets / audio / transcripts into detail from callers.
    console.log(PREFIX, event, detail);
  } else {
    console.log(PREFIX, event);
  }
}
