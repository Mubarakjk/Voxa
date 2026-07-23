type TimingKey =
  | 'home.cold'
  | 'home.warm'
  | 'chat.load'
  | 'chat.send'
  | 'journey.load'
  | 'routine.load'
  | 'memory.load'
  | 'app.coldStart'
  | 'app.warmStart';

type TimingSample = { ms: number; at: string };

const samples: Partial<Record<TimingKey, TimingSample[]>> = {};
let dashboardCacheHits = 0;
let dashboardCacheMisses = 0;
let appStartAt = Date.now();
let firstScreenAt: number | null = null;

function pushSample(key: TimingKey, ms: number) {
  const list = samples[key] ?? [];
  list.unshift({ ms, at: new Date().toISOString() });
  if (list.length > 20) list.length = 20;
  samples[key] = list;
}

export function recordTiming(key: TimingKey, ms: number) {
  pushSample(key, ms);
}

export function recordDashboardCacheHit() {
  dashboardCacheHits += 1;
}

export function recordDashboardCacheMiss() {
  dashboardCacheMisses += 1;
}

export function markFirstScreen() {
  if (firstScreenAt == null) {
    firstScreenAt = Date.now();
    recordTiming('app.coldStart', firstScreenAt - appStartAt);
  } else {
    recordTiming('app.warmStart', Date.now() - appStartAt);
  }
  appStartAt = Date.now();
}

function avg(key: TimingKey): number | null {
  const list = samples[key];
  if (!list?.length) return null;
  return Math.round(list.reduce((sum, s) => sum + s.ms, 0) / list.length);
}

function last(key: TimingKey): number | null {
  return samples[key]?.[0]?.ms ?? null;
}

export function getPerformanceReport() {
  const cacheTotal = dashboardCacheHits + dashboardCacheMisses;
  return {
    timings: {
      homeColdMs: { last: last('home.cold'), avg: avg('home.cold') },
      homeWarmMs: { last: last('home.warm'), avg: avg('home.warm') },
      chatLoadMs: { last: last('chat.load'), avg: avg('chat.load') },
      chatSendMs: { last: last('chat.send'), avg: avg('chat.send') },
      journeyLoadMs: { last: last('journey.load'), avg: avg('journey.load') },
      routineLoadMs: { last: last('routine.load'), avg: avg('routine.load') },
      memoryLoadMs: { last: last('memory.load'), avg: avg('memory.load') },
      appColdStartMs: { last: last('app.coldStart'), avg: avg('app.coldStart') },
      appWarmStartMs: { last: last('app.warmStart'), avg: avg('app.warmStart') },
    },
    cache: {
      dashboardHits: dashboardCacheHits,
      dashboardMisses: dashboardCacheMisses,
      hitPercent: cacheTotal > 0 ? Math.round((dashboardCacheHits / cacheTotal) * 100) : null,
    },
    samples: { ...samples },
  };
}
