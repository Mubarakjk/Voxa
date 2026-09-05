import { VoiceAccent, VOICE_ACCENTS } from './voice-accents';

const EXTRA_REGIONS: Array<{ prefix: string; label: string; region: VoiceAccent['region']; regionLabel: string; flag: string }> = [
  { prefix: 'texan', label: 'Texan', region: 'north_america', regionLabel: 'North America', flag: '🇺🇸' },
  { prefix: 'boston', label: 'Boston', region: 'north_america', regionLabel: 'North America', flag: '🇺🇸' },
  { prefix: 'midwest', label: 'Midwest', region: 'north_america', regionLabel: 'North America', flag: '🇺🇸' },
  { prefix: 'atlanta', label: 'Atlanta', region: 'north_america', regionLabel: 'North America', flag: '🇺🇸' },
  { prefix: 'dublin', label: 'Dublin', region: 'english', regionLabel: 'English', flag: '🇮🇪' },
  { prefix: 'birmingham', label: 'Birmingham', region: 'english', regionLabel: 'English', flag: '🇬🇧' },
  { prefix: 'yorkshire', label: 'Yorkshire', region: 'english', regionLabel: 'English', flag: '🇬🇧' },
  { prefix: 'cockney', label: 'Cockney', region: 'english', regionLabel: 'English', flag: '🇬🇧' },
  { prefix: 'parisian', label: 'Parisian English', region: 'europe', regionLabel: 'Europe', flag: '🇫🇷' },
  { prefix: 'berlin', label: 'Berlin English', region: 'europe', regionLabel: 'Europe', flag: '🇩🇪' },
  { prefix: 'stockholm', label: 'Stockholm English', region: 'europe', regionLabel: 'Europe', flag: '🇸🇪' },
  { prefix: 'lisbon', label: 'Lisbon English', region: 'europe', regionLabel: 'Europe', flag: '🇵🇹' },
  { prefix: 'mumbai', label: 'Mumbai English', region: 'asia', regionLabel: 'Asia', flag: '🇮🇳' },
  { prefix: 'bangalore', label: 'Bangalore English', region: 'asia', regionLabel: 'Asia', flag: '🇮🇳' },
  { prefix: 'tokyo', label: 'Tokyo English', region: 'asia', regionLabel: 'Asia', flag: '🇯🇵' },
  { prefix: 'seoul', label: 'Seoul English', region: 'asia', regionLabel: 'Asia', flag: '🇰🇷' },
  { prefix: 'bangkok', label: 'Bangkok English', region: 'asia', regionLabel: 'Asia', flag: '🇹🇭' },
  { prefix: 'jakarta', label: 'Jakarta English', region: 'asia', regionLabel: 'Asia', flag: '🇮🇩' },
  { prefix: 'cairo', label: 'Cairo English', region: 'middle_east', regionLabel: 'Middle East', flag: '🇪🇬' },
  { prefix: 'istanbul', label: 'Istanbul English', region: 'middle_east', regionLabel: 'Middle East', flag: '🇹🇷' },
  { prefix: 'lagos', label: 'Lagos English', region: 'africa', regionLabel: 'Africa', flag: '🇳🇬' },
  { prefix: 'nairobi', label: 'Nairobi English', region: 'africa', regionLabel: 'Africa', flag: '🇰🇪' },
  { prefix: 'accra', label: 'Accra English', region: 'africa', regionLabel: 'Africa', flag: '🇬🇭' },
  { prefix: 'auckland', label: 'Auckland English', region: 'oceania', regionLabel: 'Oceania', flag: '🇳🇿' },
  { prefix: 'melbourne', label: 'Melbourne English', region: 'oceania', regionLabel: 'Oceania', flag: '🇦🇺' },
];

const STYLE_SUFFIXES = ['warm', 'crisp', 'soft', 'bright', 'deep', 'light'];

function buildExtendedAccents(): VoiceAccent[] {
  const hints = ['nova', 'shimmer', 'echo', 'fable', 'onyx', 'coral', 'sage', 'alloy'];
  const extras: VoiceAccent[] = [];

  EXTRA_REGIONS.forEach((region, index) => {
    STYLE_SUFFIXES.forEach((style, styleIndex) => {
      const id = `${region.prefix}_${style}`;
      if (VOICE_ACCENTS.some((a) => a.id === id)) return;
      // Only the first style per region is selectable. The engines cannot produce
      // authentic regional accents — remaining variants stay visible as Coming soon.
      const selectable = styleIndex === 0;
      extras.push({
        id,
        label: selectable ? region.label : `${region.label} (${style})`,
        region: region.region,
        regionLabel: region.regionLabel,
        flag: region.flag,
        description: selectable
          ? `${region.label}-inspired voice colour via TTS — not a recorded regional accent.`
          : `${region.label} (${style}) voice colour is not available in V1 TTS.`,
        available: selectable,
        isPremium: true,
        futureSupport: !selectable,
        openAiVoiceHint: hints[(index + styleIndex) % hints.length],
      });
    });
  });

  return extras;
}

export const EXTENDED_VOICE_ACCENTS: VoiceAccent[] = buildExtendedAccents();

export const ALL_VOICE_ACCENTS: VoiceAccent[] = [...VOICE_ACCENTS, ...EXTENDED_VOICE_ACCENTS];

export function getAllAccentById(id: string): VoiceAccent | undefined {
  return ALL_VOICE_ACCENTS.find((a) => a.id === id);
}

export function getAllAccentsByRegion(region: VoiceAccent['region']): VoiceAccent[] {
  return ALL_VOICE_ACCENTS.filter((a) => a.region === region);
}

export function getAccentCount(): number {
  return ALL_VOICE_ACCENTS.length;
}
