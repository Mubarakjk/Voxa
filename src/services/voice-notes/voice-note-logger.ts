function safeDetail(detail?: string): string | undefined {
  if (!detail) return undefined;
  if (detail.includes('/')) return detail.split('/').pop()?.slice(0, 24);
  return detail.slice(0, 120);
}

export function voiceNoteLog(event: string, detail?: string) {
  const suffix = safeDetail(detail);
  console.info(`[Voxa] VOICE_NOTE_${event}${suffix ? ` · ${suffix}` : ''}`);
}
