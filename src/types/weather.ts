import { ISODateString } from './common';

export type WeatherLocationMode = 'not_set' | 'device' | 'manual' | 'declined';

export type WeatherPermissionStatus = 'undetermined' | 'granted' | 'denied';

export type WeatherLocationPreference = {
  mode: WeatherLocationMode;
  cityName?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  permissionStatus?: WeatherPermissionStatus;
  locationServicesEnabled?: boolean;
  permissionPromptShown: boolean;
  updatedAt: ISODateString;
};

export type WeatherConditionCode =
  | 'clear'
  | 'partly_cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'thunderstorm'
  | 'unknown';

export type WeatherCurrent = {
  temperatureC: number;
  apparentTemperatureC: number;
  humidityPercent: number;
  windSpeedKmh: number;
  precipitationMm: number;
  uvIndex?: number;
  airQualityIndex?: number;
  condition: WeatherConditionCode;
  conditionLabel: string;
  observedAt: ISODateString;
};

export type WeatherHourlyPoint = {
  time: ISODateString;
  temperatureC: number;
  precipitationProbabilityPercent: number;
  condition: WeatherConditionCode;
  conditionLabel: string;
};

export type WeatherDailyPoint = {
  date: string;
  tempMinC: number;
  tempMaxC: number;
  precipitationProbabilityMaxPercent: number;
  uvIndexMax?: number;
  sunrise?: string;
  sunset?: string;
  condition: WeatherConditionCode;
  conditionLabel: string;
};

export type WeatherBundle = {
  locationLabel: string;
  latitude: number;
  longitude: number;
  timezone: string;
  current: WeatherCurrent;
  hourly: WeatherHourlyPoint[];
  daily: WeatherDailyPoint[];
  fetchedAt: ISODateString;
  fromCache: boolean;
  provider: string;
};

export type WeatherUnavailableReason =
  | 'no_location'
  | 'permission_denied'
  | 'location_services_disabled'
  | 'offline'
  | 'provider_error';

export type WeatherFetchResult =
  | { ok: true; data: WeatherBundle }
  | { ok: false; reason: WeatherUnavailableReason; message: string; cached?: WeatherBundle };

export type WeatherCacheEntry = {
  bundle: WeatherBundle;
  cachedAt: ISODateString;
};
