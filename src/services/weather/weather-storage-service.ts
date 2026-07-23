import { STORAGE_KEYS } from '../../constants/storage-keys';
import { ISODateString, nowIso } from '../../types';
import { WeatherCacheEntry, WeatherLocationPreference } from '../../types/weather';
import { IStorageService } from '../contracts';

const DEFAULT_PREFERENCE: WeatherLocationPreference = {
  mode: 'not_set',
  permissionPromptShown: false,
  updatedAt: nowIso(),
};

export class WeatherLocationPreferenceService {
  constructor(private readonly storage: IStorageService) {}

  async get(): Promise<WeatherLocationPreference> {
    return (
      (await this.storage.getItem<WeatherLocationPreference>(STORAGE_KEYS.weatherLocationPreference)) ??
      DEFAULT_PREFERENCE
    );
  }

  async save(patch: Partial<WeatherLocationPreference>): Promise<WeatherLocationPreference> {
    const current = await this.get();
    const next: WeatherLocationPreference = {
      ...current,
      ...patch,
      updatedAt: nowIso(),
    };
    await this.storage.setItem(STORAGE_KEYS.weatherLocationPreference, next);
    return next;
  }

  async markPermissionPromptShown(): Promise<WeatherLocationPreference> {
    return this.save({ permissionPromptShown: true });
  }

  async clearDeviceLocation(): Promise<WeatherLocationPreference> {
    const current = await this.get();
    if (current.mode !== 'device') return current;
    return this.save({
      mode: 'not_set',
      latitude: undefined,
      longitude: undefined,
    });
  }

  formatLabel(pref: WeatherLocationPreference): string {
    if (pref.mode === 'declined') return 'Not using weather';
    if (pref.mode === 'manual' && pref.cityName) {
      return [pref.cityName, pref.region, pref.country].filter(Boolean).join(', ');
    }
    if (pref.mode === 'device') {
      if (pref.cityName) return `${pref.cityName} · device location`;
      return 'Device location';
    }
    return 'Not set';
  }

  hasResolvableLocation(pref: WeatherLocationPreference): boolean {
    if (pref.mode === 'declined' || pref.mode === 'not_set') return false;
    return typeof pref.latitude === 'number' && typeof pref.longitude === 'number';
  }
}

export class WeatherCacheService {
  constructor(private readonly storage: IStorageService) {}

  async read(): Promise<WeatherCacheEntry | null> {
    return (await this.storage.getItem<WeatherCacheEntry>(STORAGE_KEYS.weatherCache)) ?? null;
  }

  async write(entry: WeatherCacheEntry): Promise<void> {
    await this.storage.setItem(STORAGE_KEYS.weatherCache, entry);
  }

  isFresh(cachedAt: ISODateString, ttlMinutes = 45): boolean {
    const ageMs = Date.now() - new Date(cachedAt).getTime();
    return ageMs >= 0 && ageMs < ttlMinutes * 60_000;
  }
}

let prefInstance: WeatherLocationPreferenceService | null = null;
let cacheInstance: WeatherCacheService | null = null;

export function getWeatherLocationPreferenceService(storage: IStorageService) {
  if (!prefInstance) prefInstance = new WeatherLocationPreferenceService(storage);
  return prefInstance;
}

export function getWeatherCacheService(storage: IStorageService) {
  if (!cacheInstance) cacheInstance = new WeatherCacheService(storage);
  return cacheInstance;
}

export function resetWeatherStorageServices() {
  prefInstance = null;
  cacheInstance = null;
}
