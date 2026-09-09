export type FeatureLogLevel = 'start' | 'success' | 'failure';

export type FeatureLogEntry = {
  feature: string;
  level: FeatureLogLevel;
  detail?: string;
  ms?: number;
  at: string;
};

const MAX_ENTRIES = 200;
const entries: FeatureLogEntry[] = [];

export function logFeature(
  feature: string,
  level: FeatureLogLevel,
  detail?: string,
  ms?: number,
) {
  const entry: FeatureLogEntry = {
    feature,
    level,
    detail,
    ms,
    at: new Date().toISOString(),
  };
  entries.unshift(entry);
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;

  const suffix = `${ms != null ? ` ${ms}ms` : ''}${detail ? ` — ${detail}` : ''}`;
  const line = `${level.toUpperCase()}${suffix}`;

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    // console.log only — console.error surfaces as a LogBox toast on expo-dev-client.
    console.log(`[Voxa:${feature}]`, line);
  }
}

/** Production Talk UI must never render feature-log lines. */
export function talkDiagnosticsAreUserVisible(): false {
  return false;
}

export function logFeatureTimed<T>(
  feature: string,
  action: string,
  fn: () => Promise<T>,
): Promise<T> {
  const key = `${feature}.${action}`;
  const started = Date.now();
  logFeature(key, 'start');
  return fn()
    .then((result) => {
      logFeature(key, 'success', undefined, Date.now() - started);
      return result;
    })
    .catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      logFeature(key, 'failure', message, Date.now() - started);
      throw err;
    });
}

export function getFeatureLogs(feature?: string, limit = 50): FeatureLogEntry[] {
  const filtered = feature ? entries.filter((e) => e.feature.startsWith(feature)) : entries;
  return filtered.slice(0, limit);
}

export function getLastFeatureLog(feature: string): FeatureLogEntry | null {
  return entries.find((e) => e.feature === feature) ?? null;
}
