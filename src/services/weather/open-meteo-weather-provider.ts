import {
  WeatherBundle,
  WeatherCurrent,
  WeatherDailyPoint,
  WeatherHourlyPoint,
} from '../../types/weather';
import { mapWeatherCode, WeatherProvider, WeatherProviderInput } from './weather-providers';

type OpenMeteoCurrent = {
  time: string;
  temperature_2m: number;
  apparent_temperature: number;
  relative_humidity_2m: number;
  precipitation: number;
  weather_code: number;
  wind_speed_10m: number;
};

type OpenMeteoResponse = {
  timezone: string;
  current?: OpenMeteoCurrent;
  hourly?: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    weather_code: number[];
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    uv_index_max: number[];
    sunrise: string[];
    sunset: string[];
  };
};

export class OpenMeteoWeatherProvider implements WeatherProvider {
  readonly id = 'open-meteo';

  async fetchForecast(input: WeatherProviderInput): Promise<WeatherBundle> {
    const params = new URLSearchParams({
      latitude: String(input.latitude),
      longitude: String(input.longitude),
      timezone: input.timezone ?? 'auto',
      current: [
        'temperature_2m',
        'apparent_temperature',
        'relative_humidity_2m',
        'precipitation',
        'weather_code',
        'wind_speed_10m',
      ].join(','),
      hourly: ['temperature_2m', 'precipitation_probability', 'weather_code'].join(','),
      daily: [
        'weather_code',
        'temperature_2m_max',
        'temperature_2m_min',
        'precipitation_probability_max',
        'uv_index_max',
        'sunrise',
        'sunset',
      ].join(','),
      forecast_days: '7',
    });

    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Weather provider error (${response.status})`);
    }
    const payload = (await response.json()) as OpenMeteoResponse;
    if (!payload.current) throw new Error('Weather provider returned incomplete data');

    const currentMapped = mapWeatherCode(payload.current.weather_code);
    const current: WeatherCurrent = {
      temperatureC: payload.current.temperature_2m,
      apparentTemperatureC: payload.current.apparent_temperature,
      humidityPercent: payload.current.relative_humidity_2m,
      windSpeedKmh: payload.current.wind_speed_10m,
      precipitationMm: payload.current.precipitation,
      condition: currentMapped.condition,
      conditionLabel: currentMapped.label,
      observedAt: payload.current.time,
    };

    const hourly: WeatherHourlyPoint[] = (payload.hourly?.time ?? []).slice(0, 24).map((time, index) => {
      const mapped = mapWeatherCode(payload.hourly!.weather_code[index] ?? 0);
      return {
        time,
        temperatureC: payload.hourly!.temperature_2m[index] ?? current.temperatureC,
        precipitationProbabilityPercent: payload.hourly!.precipitation_probability[index] ?? 0,
        condition: mapped.condition,
        conditionLabel: mapped.label,
      };
    });

    const daily: WeatherDailyPoint[] = (payload.daily?.time ?? []).map((date, index) => {
      const mapped = mapWeatherCode(payload.daily!.weather_code[index] ?? 0);
      return {
        date,
        tempMinC: payload.daily!.temperature_2m_min[index] ?? current.temperatureC,
        tempMaxC: payload.daily!.temperature_2m_max[index] ?? current.temperatureC,
        precipitationProbabilityMaxPercent: payload.daily!.precipitation_probability_max[index] ?? 0,
        uvIndexMax: payload.daily!.uv_index_max[index],
        sunrise: payload.daily!.sunrise[index]?.slice(11, 16),
        sunset: payload.daily!.sunset[index]?.slice(11, 16),
        condition: mapped.condition,
        conditionLabel: mapped.label,
      };
    });

    return {
      locationLabel: input.locationLabel,
      latitude: input.latitude,
      longitude: input.longitude,
      timezone: payload.timezone,
      current,
      hourly,
      daily,
      fetchedAt: new Date().toISOString(),
      fromCache: false,
      provider: this.id,
    };
  }
}

export type GeocodeResult = {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
};

export async function geocodeCity(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const params = new URLSearchParams({ name: trimmed, count: '1', language: 'en', format: 'json' });
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`);
  if (!response.ok) return null;
  const payload = (await response.json()) as {
    results?: Array<{ name: string; latitude: number; longitude: number; country?: string; admin1?: string }>;
  };
  const hit = payload.results?.[0];
  if (!hit) return null;
  return {
    name: hit.name,
    latitude: hit.latitude,
    longitude: hit.longitude,
    country: hit.country,
    admin1: hit.admin1,
  };
}

export class ProxyWeatherProvider implements WeatherProvider {
  readonly id = 'proxy';

  constructor(private readonly baseUrl: string) {}

  async fetchForecast(input: WeatherProviderInput): Promise<WeatherBundle> {
    const url = `${this.baseUrl.replace(/\/$/, '')}/forecast`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(`Weather proxy error (${response.status})`);
    const bundle = (await response.json()) as WeatherBundle;
    return { ...bundle, fromCache: false, provider: this.id };
  }
}
