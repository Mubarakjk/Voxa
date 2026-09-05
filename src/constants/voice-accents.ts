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
  { id: 'british_rp', label: 'British RP', region: 'english', regionLabel: 'English', flag: '🇬🇧', description: 'Polished TTS voice colour inspired by Received Pronunciation — not a recorded accent.', available: true, isPremium: false, openAiVoiceHint: 'nova' },
  { id: 'london', label: 'London', region: 'english', regionLabel: 'English', flag: '🇬🇧', description: 'Warm urban TTS voice colour — not a recorded London accent.', available: true, isPremium: true, openAiVoiceHint: 'coral' },
  { id: 'manchester', label: 'Manchester', region: 'english', regionLabel: 'English', flag: '🇬🇧', description: 'Direct, friendly TTS voice colour — not a recorded Northern accent.', available: true, isPremium: true, openAiVoiceHint: 'fable' },
  { id: 'liverpool', label: 'Liverpool', region: 'english', regionLabel: 'English', flag: '🇬🇧', description: 'Expressive TTS voice colour — coming soon as a dedicated accent.', available: false, isPremium: true, futureSupport: true, openAiVoiceHint: 'echo' },
  { id: 'scottish', label: 'Scottish', region: 'english', regionLabel: 'English', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', description: 'Grounded TTS voice colour inspired by Scottish English — not a recorded accent.', available: true, isPremium: true, openAiVoiceHint: 'sage' },
  { id: 'welsh', label: 'Welsh', region: 'english', regionLabel: 'English', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', description: 'Soft lyrical TTS voice colour — coming soon as a dedicated accent.', available: false, isPremium: true, futureSupport: true, openAiVoiceHint: 'shimmer' },
  { id: 'irish', label: 'Irish', region: 'english', regionLabel: 'English', flag: '🇮🇪', description: 'Warm musical TTS voice colour inspired by Irish English — not a recorded accent.', available: true, isPremium: true, openAiVoiceHint: 'shimmer' },

  // North America
  { id: 'american_general', label: 'American General', region: 'north_america', regionLabel: 'North America', flag: '🇺🇸', description: 'Clear versatile TTS voice colour — not a recorded regional accent.', available: true, isPremium: false, openAiVoiceHint: 'alloy' },
  { id: 'new_york', label: 'New York', region: 'north_america', regionLabel: 'North America', flag: '🇺🇸', description: 'Confident TTS voice colour — not a recorded New York accent.', available: true, isPremium: true, openAiVoiceHint: 'onyx' },
  { id: 'southern_usa', label: 'Southern USA', region: 'north_america', regionLabel: 'North America', flag: '🇺🇸', description: 'Relaxed TTS voice colour — not a recorded Southern accent.', available: true, isPremium: true, openAiVoiceHint: 'fable' },
  { id: 'california', label: 'California', region: 'north_america', regionLabel: 'North America', flag: '🇺🇸', description: 'Laid-back TTS voice colour — not a recorded California accent.', available: true, isPremium: true, openAiVoiceHint: 'coral' },
  { id: 'canadian', label: 'Canadian', region: 'north_america', regionLabel: 'North America', flag: '🇨🇦', description: 'Clear, approachable TTS voice colour inspired by Canadian English — not a recorded accent.', available: true, isPremium: true, openAiVoiceHint: 'echo' },

  // Africa
  { id: 'nigerian', label: 'Nigerian', region: 'africa', regionLabel: 'Africa', flag: '🇳🇬', description: 'Vibrant TTS voice colour — not a recorded Nigerian accent.', available: true, isPremium: true, openAiVoiceHint: 'echo' },
  { id: 'ghanaian', label: 'Ghanaian', region: 'africa', regionLabel: 'Africa', flag: '🇬🇭', description: 'Warm TTS voice colour — coming soon as a dedicated accent.', available: false, isPremium: true, futureSupport: true, openAiVoiceHint: 'sage' },
  { id: 'kenyan', label: 'Kenyan', region: 'africa', regionLabel: 'Africa', flag: '🇰🇪', description: 'Clear TTS voice colour — coming soon as a dedicated accent.', available: false, isPremium: true, futureSupport: true, openAiVoiceHint: 'nova' },
  { id: 'south_african', label: 'South African', region: 'africa', regionLabel: 'Africa', flag: '🇿🇦', description: 'Crisp TTS voice colour — not a recorded South African accent.', available: true, isPremium: true, openAiVoiceHint: 'sage' },

  // Europe
  { id: 'french_english', label: 'French English', region: 'europe', regionLabel: 'Europe', flag: '🇫🇷', description: 'Measured TTS voice colour — not a recorded French-influenced accent.', available: true, isPremium: true, openAiVoiceHint: 'shimmer' },
  { id: 'german_english', label: 'German English', region: 'europe', regionLabel: 'Europe', flag: '🇩🇪', description: 'Precise TTS voice colour — not a recorded German-influenced accent.', available: true, isPremium: true, openAiVoiceHint: 'onyx' },
  { id: 'italian_english', label: 'Italian English', region: 'europe', regionLabel: 'Europe', flag: '🇮🇹', description: 'Expressive TTS voice colour — coming soon as a dedicated accent.', available: false, isPremium: true, futureSupport: true, openAiVoiceHint: 'coral' },
  { id: 'spanish_english', label: 'Spanish English', region: 'europe', regionLabel: 'Europe', flag: '🇪🇸', description: 'Lively TTS voice colour — not a recorded Spanish-influenced accent.', available: true, isPremium: true, openAiVoiceHint: 'coral' },
  { id: 'dutch_english', label: 'Dutch English', region: 'europe', regionLabel: 'Europe', flag: '🇳🇱', description: 'Direct TTS voice colour — coming soon as a dedicated accent.', available: false, isPremium: true, futureSupport: true, openAiVoiceHint: 'alloy' },

  // Asia
  { id: 'indian_english', label: 'Indian English', region: 'asia', regionLabel: 'Asia', flag: '🇮🇳', description: 'Melodic TTS voice colour — not a recorded Indian English accent.', available: true, isPremium: true, openAiVoiceHint: 'nova' },
  { id: 'pakistani_english', label: 'Pakistani English', region: 'asia', regionLabel: 'Asia', flag: '🇵🇰', description: 'Clear TTS voice colour — coming soon as a dedicated accent.', available: false, isPremium: true, futureSupport: true, openAiVoiceHint: 'sage' },
  { id: 'filipino_english', label: 'Filipino English', region: 'asia', regionLabel: 'Asia', flag: '🇵🇭', description: 'Warm cheerful TTS voice colour — not a recorded Filipino accent.', available: true, isPremium: true, openAiVoiceHint: 'shimmer' },
  { id: 'singaporean_english', label: 'Singaporean English', region: 'asia', regionLabel: 'Asia', flag: '🇸🇬', description: 'Efficient TTS voice colour — coming soon as a dedicated accent.', available: false, isPremium: true, futureSupport: true, openAiVoiceHint: 'alloy' },
  { id: 'japanese_english', label: 'Japanese English', region: 'asia', regionLabel: 'Asia', flag: '🇯🇵', description: 'Gentle TTS voice colour — coming soon as a dedicated accent.', available: false, isPremium: true, futureSupport: true, openAiVoiceHint: 'shimmer' },
  { id: 'korean_english', label: 'Korean English', region: 'asia', regionLabel: 'Asia', flag: '🇰🇷', description: 'Clear TTS voice colour — coming soon as a dedicated accent.', available: false, isPremium: true, futureSupport: true, openAiVoiceHint: 'nova' },
  { id: 'chinese_english', label: 'Chinese English', region: 'asia', regionLabel: 'Asia', flag: '🇨🇳', description: 'Measured TTS voice colour — not a recorded Chinese-influenced accent.', available: true, isPremium: true, openAiVoiceHint: 'sage' },

  // Oceania
  { id: 'australian', label: 'Australian', region: 'oceania', regionLabel: 'Oceania', flag: '🇦🇺', description: 'Relaxed TTS voice colour — not a recorded Australian accent.', available: true, isPremium: true, openAiVoiceHint: 'coral' },
  { id: 'new_zealand', label: 'New Zealand', region: 'oceania', regionLabel: 'Oceania', flag: '🇳🇿', description: 'Soft TTS voice colour — coming soon as a dedicated accent.', available: false, isPremium: true, futureSupport: true, openAiVoiceHint: 'fable' },

  // Middle East
  { id: 'emirati_english', label: 'Emirati English', region: 'middle_east', regionLabel: 'Middle East', flag: '🇦🇪', description: 'Polished TTS voice colour — coming soon as a dedicated accent.', available: false, isPremium: true, futureSupport: true, openAiVoiceHint: 'onyx' },
  { id: 'saudi_english', label: 'Saudi English', region: 'middle_east', regionLabel: 'Middle East', flag: '🇸🇦', description: 'Warm TTS voice colour — coming soon as a dedicated accent.', available: false, isPremium: true, futureSupport: true, openAiVoiceHint: 'echo' },

  // Neutral
  { id: 'international_english', label: 'International English', region: 'neutral', regionLabel: 'Neutral', flag: '🌍', description: 'Neutral TTS voice colour — clear and widely familiar. Not a recorded regional accent.', available: true, isPremium: false, openAiVoiceHint: 'nova' },
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
