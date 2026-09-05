import { PersonalityStyleId } from '../constants/companion-identity';
import { VoicePersonality } from '../types';

export const ONBOARDING_STEPS = [
  'welcome',
  'basics',
  'createVoxa',
  'reason',
  'meetVoxa',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export type OnboardingPersonalityChoice = 'warm' | 'energetic' | 'calm' | 'direct';

export const ONBOARDING_PERSONALITY_OPTIONS: Array<{
  id: OnboardingPersonalityChoice;
  label: string;
  personalityStyle: PersonalityStyleId;
  voicePersonality: VoicePersonality;
}> = [
  { id: 'warm', label: 'Warm', personalityStyle: 'warm', voicePersonality: 'warm_calm' },
  {
    id: 'energetic',
    label: 'Energetic',
    personalityStyle: 'motivational',
    voicePersonality: 'energetic',
  },
  { id: 'calm', label: 'Calm', personalityStyle: 'reflective', voicePersonality: 'gentle' },
  { id: 'direct', label: 'Direct', personalityStyle: 'direct', voicePersonality: 'direct' },
];

export const ONBOARDING_REASON_OPTIONS = [
  'Get my life organised',
  'Reach my goals',
  'Have someone to talk to',
  'Build better habits',
  'Study / career',
  'Figure things out as I go',
] as const;

export type OnboardingReason = (typeof ONBOARDING_REASON_OPTIONS)[number];

export const MAX_ONBOARDING_REASONS = 3;

export function clampOnboardingStepIndex(stepIndex: number): number {
  return Math.min(Math.max(0, stepIndex), ONBOARDING_STEPS.length - 1);
}

export function resolvePersonalityChoice(
  choice: OnboardingPersonalityChoice,
): { personalityStyle: PersonalityStyleId; voicePersonality: VoicePersonality } {
  const match = ONBOARDING_PERSONALITY_OPTIONS.find((item) => item.id === choice);
  return {
    personalityStyle: match?.personalityStyle ?? 'warm',
    voicePersonality: match?.voicePersonality ?? 'warm_calm',
  };
}

export function validateOnboardingBasics(displayName: string): string | null {
  if (!displayName.trim()) {
    return 'Please enter what Voxa should call you.';
  }
  return null;
}

export function normalizeOnboardingReasons(input: string[] | string | undefined | null): string[] {
  const raw = Array.isArray(input) ? input : typeof input === 'string' && input.trim() ? [input.trim()] : [];
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const item of raw) {
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    if (!ONBOARDING_REASON_OPTIONS.includes(trimmed as OnboardingReason)) continue;
    seen.add(trimmed);
    normalized.push(trimmed);
    if (normalized.length >= MAX_ONBOARDING_REASONS) break;
  }
  return normalized;
}

export function resolvePrimaryOnboardingReason(reasons: string[]): string {
  return normalizeOnboardingReasons(reasons)[0] ?? '';
}

/** @deprecated Use validateOnboardingReasons — kept for single-value callers. */
export function validateOnboardingReason(mainReason: string): string | null {
  return validateOnboardingReasons(normalizeOnboardingReasons(mainReason));
}

export function validateOnboardingReasons(reasons: string[]): string | null {
  const normalized = normalizeOnboardingReasons(reasons);
  if (normalized.length === 0) {
    return 'Choose at least one area for Voxa to help with.';
  }
  if (normalized.length > MAX_ONBOARDING_REASONS) {
    return `Choose up to ${MAX_ONBOARDING_REASONS} areas.`;
  }
  return null;
}

export function toggleOnboardingReason(selected: string[], reason: OnboardingReason): string[] {
  const normalized = normalizeOnboardingReasons(selected);
  if (normalized.includes(reason)) {
    return normalized.filter((item) => item !== reason);
  }
  if (normalized.length >= MAX_ONBOARDING_REASONS) {
    return normalized;
  }
  return [...normalized, reason];
}

export function isOnboardingReasonDisabled(selected: string[], reason: OnboardingReason): boolean {
  const normalized = normalizeOnboardingReasons(selected);
  return normalized.length >= MAX_ONBOARDING_REASONS && !normalized.includes(reason);
}

export function buildOnboardingReasonContext(input: {
  mainReason?: string;
  goalInterests?: string[];
}): string[] {
  const fromProfile = normalizeOnboardingReasons(input.goalInterests);
  if (fromProfile.length > 0) return fromProfile;
  return normalizeOnboardingReasons(input.mainReason);
}
