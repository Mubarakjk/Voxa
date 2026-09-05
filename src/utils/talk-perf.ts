/** Development-only Talk timing. Never log message/memory/PII content. */

export function talkPerf(stage: string, ms: number): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  console.log(`[TALK PERF] ${stage}: ${Math.max(0, Math.round(ms))}ms`);
}

export function talkPerfNow(): number {
  return Date.now();
}
