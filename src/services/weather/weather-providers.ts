import {
  WeatherBundle,
  WeatherConditionCode,
  WeatherCurrent,
  WeatherDailyPoint,
  WeatherHourlyPoint,
} from '../../types/weather';

export type WeatherProviderInput = {
  latitude: number;
  longitude: number;
  locationLabel: string;
  timezone?: string;
};

export interface WeatherProvider {
  readonly id: string;
  fetchForecast(input: WeatherProviderInput): Promise<WeatherBundle>;
}

export function mapWeatherCode(code: number): { condition: WeatherConditionCode; label: string } {
  if (code === 0) return { condition: 'clear', label: 'Clear' };
  if (code <= 3) return { condition: 'partly_cloudy', label: 'Partly cloudy' };
  if (code <= 48) return { condition: 'fog', label: 'Foggy' };
  if (code <= 57) return { condition: 'drizzle', label: 'Drizzle' };
  if (code <= 67) return { condition: 'rain', label: 'Rain' };
  if (code <= 77) return { condition: 'snow', label: 'Snow' };
  if (code <= 82) return { condition: 'rain', label: 'Showers' };
  if (code >= 95) return { condition: 'thunderstorm', label: 'Thunderstorm' };
  return { condition: 'cloudy', label: 'Cloudy' };
}

export function buildMockWeatherBundle(input: WeatherProviderInput): WeatherBundle {
  const now = new Date();
  const hourly: WeatherHourlyPoint[] = Array.from({ length: 12 }, (_, index) => {
    const time = new Date(now.getTime() + index * 3600_000);
    return {
      time: time.toISOString(),
      temperatureC: 14 + index * 0.4,
      precipitationProbabilityPercent: index >= 4 && index <= 6 ? 70 : 10,
      condition: index >= 4 && index <= 6 ? 'rain' : 'partly_cloudy',
      conditionLabel: index >= 4 && index <= 6 ? 'Rain' : 'Partly cloudy',
    };
  });
  const daily: WeatherDailyPoint[] = Array.from({ length: 7 }, (_, index) => ({
    date: new Date(now.getTime() + index * 86400_000).toISOString().slice(0, 10),
    tempMinC: 9 + index,
    tempMaxC: 15 + index,
    precipitationProbabilityMaxPercent: index === 1 ? 65 : 15,
    uvIndexMax: 4,
    sunrise: '06:42',
    sunset: '19:18',
    condition: index === 1 ? 'rain' : 'partly_cloudy',
    conditionLabel: index === 1 ? 'Rain' : 'Partly cloudy',
  }));
  const current: WeatherCurrent = {
    temperatureC: 15,
    apparentTemperatureC: 14,
    humidityPercent: 58,
    windSpeedKmh: 12,
    precipitationMm: 0,
    uvIndex: 3,
    condition: 'partly_cloudy',
    conditionLabel: 'Partly cloudy',
    observedAt: now.toISOString(),
  };
  return {
    locationLabel: input.locationLabel,
    latitude: input.latitude,
    longitude: input.longitude,
    timezone: input.timezone ?? 'UTC',
    current,
    hourly,
    daily,
    fetchedAt: now.toISOString(),
    fromCache: false,
    provider: 'mock',
  };
}

export class MockWeatherProvider implements WeatherProvider {
  readonly id = 'mock';

  async fetchForecast(input: WeatherProviderInput): Promise<WeatherBundle> {
    return buildMockWeatherBundle(input);
  }
}
