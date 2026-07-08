export type AccentRegion =
  | 'english'
  | 'north_america'
  | 'africa'
  | 'europe'
  | 'asia'
  | 'oceania'
  | 'middle_east'
  | 'neutral';

export type VoiceAccent = {
  id: string;
  label: string;
  region: AccentRegion;
  regionLabel: string;
  flag: string;
  description: string;
  available: boolean;
  isPremium: boolean;
  futureSupport?: boolean;
  openAiVoiceHint?: string;
};

export const ACCENT_REGIONS: Array<{ id: AccentRegion; label: string }> = [
  { id: 'english', label: 'English' },
  { id: 'north_america', label: 'North America' },
  { id: 'africa', label: 'Africa' },
  { id: 'europe', label: 'Europe' },
  { id: 'asia', label: 'Asia' },
  { id: 'oceania', label: 'Oceania' },
  { id: 'middle_east', label: 'Middle East' },
  { id: 'neutral', label: 'Neutral' },
];

export const VOICE_ACCENTS: VoiceAccent[] = [
  // English
  { id: 'british_rp', label: 'British RP', region: 'english', regionLabel: 'English', flag: '🇬🇧', description: 'Refined Received Pronunciation — polished and articulate.', available: true, isPremium: false, openAiVoiceHint: 'nova' },
  { id: 'london', label: 'London', region: 'english', regionLabel: 'English', flag: '🇬🇧', description: 'Contemporary London accent — urban and warm.', available: true, isPremium: true, openAiVoiceHint: 'coral' },
  { id: 'manchester', label: 'Manchester', region: 'english', regionLabel: 'English', flag: '🇬🇧', description: 'Northern English warmth with friendly directness.', available: true, isPremium: true, openAiVoiceHint: 'fable' },
  { id: 'liverpool', label: 'Liverpool', region: 'english', regionLabel: 'English', flag: '🇬🇧', description: 'Scouse character — expressive and lively.', available: false, isPremium: true, futureSupport: true, openAiVoiceHint: 'echo' },
  { id: 'scottish', label: 'Scottish', region: 'english', regionLabel: 'English', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', description: 'Scottish English — melodic and grounded.', available: true, isPremium: true, openAiVoiceHint: 'sage' },
  { id: 'welsh', label: 'Welsh', region: 'english', regionLabel: 'English', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', description: 'Welsh English — soft and lyrical.', available: false, isPremium: true, futureSupport: true, openAiVoiceHint: 'shimmer' },
  { id: 'irish', label: 'Irish', region: 'english', regionLabel: 'English', flag: '🇮🇪', description: 'Irish English — warm, musical, and engaging.', available: true, isPremium: true, openAiVoiceHint: 'shimmer' },

  // North America
  { id: 'american_general', label: 'American General', region: 'north_america', regionLabel: 'North America', flag: '🇺🇸', description: 'Neutral American — clear and versatile.', available: true, isPremium: false, openAiVoiceHint: 'alloy' },
  { id: 'new_york', label: 'New York', region: 'north_america', regionLabel: 'North America', flag: '🇺🇸', description: 'New York energy — confident and fast-paced.', available: true, isPremium: true, openAiVoiceHint: 'onyx' },
  { id: 'southern_usa', label: 'Southern USA', region: 'north_america', regionLabel: 'North America', flag: '🇺🇸', description: 'Southern warmth — relaxed and hospitable.', available: true, isPremium: true, openAiVoiceHint: 'fable' },
  { id: 'california', label: 'California', region: 'north_america', regionLabel: 'North America', flag: '🇺🇸', description: 'West Coast ease — laid-back and friendly.', available: true, isPremium: true, openAiVoiceHint: 'coral' },
  { id: 'canadian', label: 'Canadian', region: 'north_america', regionLabel: 'North America', flag: '🇨🇦', description: 'Canadian English — polite, clear, and approachable.', available: true, isPremium: true, openAiVoiceHint: 'nova' },

  // Africa
  { id: 'nigerian', label: 'Nigerian', region: 'africa', regionLabel: 'Africa', flag: '🇳🇬', description: 'Nigerian English — vibrant and expressive.', available: true, isPremium: true, openAiVoiceHint: 'echo' },
  { id: 'ghanaian', label: 'Ghanaian', region: 'africa', regionLabel: 'Africa', flag: '🇬🇭', description: 'Ghanaian English — melodic and warm.', available: false, isPremium: true, futureSupport: true, openAiVoiceHint: 'sage' },
  { id: 'kenyan', label: 'Kenyan', region: 'africa', regionLabel: 'Africa', flag: '🇰🇪', description: 'Kenyan English — clear and confident.', available: false, isPremium: true, futureSupport: true, openAiVoiceHint: 'nova' },
  { id: 'south_african', label: 'South African', region: 'africa', regionLabel: 'Africa', flag: '🇿🇦', description: 'South African English — crisp and articulate.', available: true, isPremium: true, openAiVoiceHint: 'sage' },

  // Europe
  { id: 'french_english', label: 'French English', region: 'europe', regionLabel: 'Europe', flag: '🇫🇷', description: 'French-influenced English — elegant and measured.', available: true, isPremium: true, openAiVoiceHint: 'shimmer' },
  { id: 'german_english', label: 'German English', region: 'europe', regionLabel: 'Europe', flag: '🇩🇪', description: 'German-influenced English — precise and structured.', available: true, isPremium: true, openAiVoiceHint: 'onyx' },
  { id: 'italian_english', label: 'Italian English', region: 'europe', regionLabel: 'Europe', flag: '🇮🇹', description: 'Italian-influenced English — expressive and warm.', available: false, isPremium: true, futureSupport: true, openAiVoiceHint: 'coral' },
  { id: 'spanish_english', label: 'Spanish English', region: 'europe', regionLabel: 'Europe', flag: '🇪🇸', description: 'Spanish-influenced English — passionate and lively.', available: true, isPremium: true, openAiVoiceHint: 'coral' },
  { id: 'dutch_english', label: 'Dutch English', region: 'europe', regionLabel: 'Europe', flag: '🇳🇱', description: 'Dutch-influenced English — direct and friendly.', available: false, isPremium: true, futureSupport: true, openAiVoiceHint: 'alloy' },

  // Asia
  { id: 'indian_english', label: 'Indian English', region: 'asia', regionLabel: 'Asia', flag: '🇮🇳', description: 'Indian English — articulate and melodic.', available: true, isPremium: true, openAiVoiceHint: 'nova' },
  { id: 'pakistani_english', label: 'Pakistani English', region: 'asia', regionLabel: 'Asia', flag: '🇵🇰', description: 'Pakistani English — clear and respectful.', available: false, isPremium: true, futureSupport: true, openAiVoiceHint: 'sage' },
  { id: 'filipino_english', label: 'Filipino English', region: 'asia', regionLabel: 'Asia', flag: '🇵🇭', description: 'Filipino English — warm and cheerful.', available: true, isPremium: true, openAiVoiceHint: 'shimmer' },
  { id: 'singaporean_english', label: 'Singaporean English', region: 'asia', regionLabel: 'Asia', flag: '🇸🇬', description: 'Singaporean English — efficient and friendly.', available: false, isPremium: true, futureSupport: true, openAiVoiceHint: 'alloy' },
  { id: 'japanese_english', label: 'Japanese English', region: 'asia', regionLabel: 'Asia', flag: '🇯🇵', description: 'Japanese-influenced English — polite and gentle.', available: false, isPremium: true, futureSupport: true, openAiVoiceHint: 'shimmer' },
  { id: 'korean_english', label: 'Korean English', region: 'asia', regionLabel: 'Asia', flag: '🇰🇷', description: 'Korean-influenced English — clear and earnest.', available: false, isPremium: true, futureSupport: true, openAiVoiceHint: 'nova' },
  { id: 'chinese_english', label: 'Chinese English', region: 'asia', regionLabel: 'Asia', flag: '🇨🇳', description: 'Chinese-influenced English — measured and thoughtful.', available: true, isPremium: true, openAiVoiceHint: 'sage' },

  // Oceania
  { id: 'australian', label: 'Australian', region: 'oceania', regionLabel: 'Oceania', flag: '🇦🇺', description: 'Australian English — relaxed and approachable.', available: true, isPremium: true, openAiVoiceHint: 'coral' },
  { id: 'new_zealand', label: 'New Zealand', region: 'oceania', regionLabel: 'Oceania', flag: '🇳🇿', description: 'New Zealand English — soft and friendly.', available: false, isPremium: true, futureSupport: true, openAiVoiceHint: 'fable' },

  // Middle East
  { id: 'emirati_english', label: 'Emirati English', region: 'middle_east', regionLabel: 'Middle East', flag: '🇦🇪', description: 'Emirati English — polished and hospitable.', available: false, isPremium: true, futureSupport: true, openAiVoiceHint: 'onyx' },
  { id: 'saudi_english', label: 'Saudi English', region: 'middle_east', regionLabel: 'Middle East', flag: '🇸🇦', description: 'Saudi English — respectful and warm.', available: false, isPremium: true, futureSupport: true, openAiVoiceHint: 'echo' },

  // Neutral
  { id: 'international_english', label: 'International English', region: 'neutral', regionLabel: 'Neutral', flag: '🌍', description: 'Accent-neutral — clear for everyone, everywhere.', available: true, isPremium: false, openAiVoiceHint: 'nova' },
];

export function getAccentById(id: string): VoiceAccent | undefined {
  return VOICE_ACCENTS.find((a) => a.id === id);
}

export function getAccentsByRegion(region: AccentRegion): VoiceAccent[] {
  return VOICE_ACCENTS.filter((a) => a.region === region);
}

export function getDefaultAccent(): VoiceAccent {
  return VOICE_ACCENTS.find((a) => a.id === 'international_english')!;
}
