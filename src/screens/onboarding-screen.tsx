import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FadeIn } from '../components/premium/premium-ui';
import { PrimaryButton } from '../components/ui/buttons';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { VoxaOrb } from '../components/ui/voxa-orb';
import {
  ONBOARDING_PERSONALITY_OPTIONS,
  ONBOARDING_REASON_OPTIONS,
  ONBOARDING_STEPS,
  clampOnboardingStepIndex,
  OnboardingPersonalityChoice,
  OnboardingStep,
  resolvePersonalityChoice,
  toggleOnboardingReason,
  isOnboardingReasonDisabled,
  validateOnboardingBasics,
  validateOnboardingReasons,
  normalizeOnboardingReasons,
  resolvePrimaryOnboardingReason,
} from '../config/onboarding-flow';
import { VOXA_AVATARS, VoxaAvatarId, getAvatarAccent } from '../constants/companion-identity';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { createDefaultCompanionControls } from '../types/relationship-personality';
import { CompanionModeId, NotificationPreference } from '../types';
import { trackEvent } from '../services/analytics/analytics-service';
import { friendlyErrorMessage } from '../utils/friendly-error';

type OnboardingScreenProps = {
  onComplete: () => void;
};

type OnboardingDraft = {
  stepIndex: number;
  displayName: string;
  voxaName: string;
  personalityChoice: OnboardingPersonalityChoice;
  avatarId: VoxaAvatarId;
  selectedReasons: string[];
  /** @deprecated legacy single-reason draft field */
  mainReason?: string;
};

const DEFAULT_VOICE_OPTION_ID = 'aurora' as const;

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { profile, services, refreshProfile } = useVoxa();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const compact = windowHeight < 720;
  const heroOrbSize = Math.round(Math.min(200, Math.max(132, windowHeight * 0.22)));
  const companionOrbSize = Math.round(Math.min(150, Math.max(112, windowHeight * 0.17)));
  const [stepIndex, setStepIndex] = useState(0);
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [voxaName, setVoxaName] = useState('Voxa');
  const [personalityChoice, setPersonalityChoice] = useState<OnboardingPersonalityChoice>('warm');
  const [avatarId, setAvatarId] = useState<VoxaAvatarId>('orb_purple');
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);

  const step = ONBOARDING_STEPS[stepIndex];
  const progress = ((stepIndex + 1) / ONBOARDING_STEPS.length) * 100;
  const { personalityStyle, voicePersonality } = resolvePersonalityChoice(personalityChoice);
  const avatarAccent = getAvatarAccent(avatarId);

  useEffect(() => {
    trackEvent('onboarding_started');
    void (async () => {
      try {
        const draft = await services.storage.getItem<OnboardingDraft>(STORAGE_KEYS.onboardingDraft);
        if (draft && typeof draft === 'object' && typeof draft.stepIndex === 'number') {
          setStepIndex(clampOnboardingStepIndex(draft.stepIndex));
          if (typeof draft.displayName === 'string') setDisplayName(draft.displayName);
          if (typeof draft.voxaName === 'string') setVoxaName(draft.voxaName);
          if (draft.personalityChoice) setPersonalityChoice(draft.personalityChoice);
          if (draft.avatarId) setAvatarId(draft.avatarId);
          if (Array.isArray(draft.selectedReasons)) {
            setSelectedReasons(normalizeOnboardingReasons(draft.selectedReasons));
          } else if (typeof draft.mainReason === 'string') {
            setSelectedReasons(normalizeOnboardingReasons(draft.mainReason));
          }
        }
      } catch {
        await services.storage.removeItem(STORAGE_KEYS.onboardingDraft);
      }
      setDraftReady(true);
    })();
  }, [services.storage]);

  useEffect(() => {
    if (!draftReady) return;
    const draft: OnboardingDraft = {
      stepIndex,
      displayName,
      voxaName,
      personalityChoice,
      avatarId,
      selectedReasons,
    };
    void services.storage.setItem(STORAGE_KEYS.onboardingDraft, draft);
  }, [
    draftReady,
    stepIndex,
    displayName,
    voxaName,
    personalityChoice,
    avatarId,
    selectedReasons,
    services.storage,
  ]);

  const validateCurrentStep = (): boolean => {
    setError(null);

    if (step === 'basics') {
      const message = validateOnboardingBasics(displayName);
      if (message) {
        setError(message);
        return false;
      }
    }

    if (step === 'reason') {
      const message = validateOnboardingReasons(selectedReasons);
      if (message) {
        setError(message);
        return false;
      }
    }

    return true;
  };

  const next = () => {
    if (!validateCurrentStep()) return;
    trackEvent('onboarding_step_completed', { step });

    if (stepIndex < ONBOARDING_STEPS.length - 1) {
      setStepIndex((value) => value + 1);
      setError(null);
      return;
    }

    void finish();
  };

  const back = () => {
    if (stepIndex > 0) {
      setStepIndex((value) => value - 1);
      setError(null);
    }
  };

  const finish = async () => {
    if (!profile) return;
    setIsSaving(true);
    setError(null);

    const basicsError = validateOnboardingBasics(displayName);
    const reasonError = validateOnboardingReasons(selectedReasons);
    if (basicsError || reasonError) {
      setError(basicsError ?? reasonError);
      setIsSaving(false);
      return;
    }

    const primaryReason = resolvePrimaryOnboardingReason(selectedReasons);

    const defaultMode: CompanionModeId = 'friend';
    const notificationPref: NotificationPreference = 'off';
    const memoryLevel = 'balanced' as const;

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await services.repositories.userProfile.updateProfile({
        displayName: displayName.trim(),
        mainReason: primaryReason,
        timezone,
        onboardingComplete: true,
        preferences: {
          ...profile.preferences,
          voicePersonality: voicePersonality,
          selectedVoiceOptionId: DEFAULT_VOICE_OPTION_ID,
          checkInStyle: 'gentle',
          morningGreetingEnabled: false,
          eveningReflectionEnabled: false,
          companionControls: {
            ...createDefaultCompanionControls(),
            ...(profile.preferences.companionControls ?? {}),
            memoryLevel,
          },
        },
        companion: {
          ...profile.companion,
          defaultMode,
          lastUsedMode: defaultMode,
        },
        companionIdentity: {
          voxaName: voxaName.trim() || 'Voxa',
          avatarId,
          personalityStyle,
          defaultMode,
          voiceStyle: voicePersonality,
          replyLength: 'balanced',
        },
        onboarding: {
          mainReason: primaryReason,
          goalInterests: normalizeOnboardingReasons(selectedReasons),
          notificationPreference: notificationPref,
          checkInFrequency: 'weekly',
        },
      });

      await refreshProfile();
      await services.storage.removeItem(STORAGE_KEYS.onboardingDraft);
      await services.storage.setItem(STORAGE_KEYS.selectedVoiceOptionId, DEFAULT_VOICE_OPTION_ID);
      trackEvent('onboarding_completed', {
        voice: DEFAULT_VOICE_OPTION_ID,
        steps: ONBOARDING_STEPS.length,
      });

      onComplete();
    } catch (err) {
      setError(friendlyErrorMessage(err, 'Could not save your setup. Please try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  const primaryLabel = getPrimaryButtonLabel(step, stepIndex, isSaving);

  return (
    <ScreenShell padded={false} glow="none" safeBottom={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: spacing.md }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>

          {step === 'welcome' ? (
            <FadeIn>
              <View style={[styles.heroBlock, compact && styles.heroBlockCompact]}>
                <VoxaOrb size={heroOrbSize} tint={colors.primary} />
                <VoxaText variant="display" style={styles.heroTitle}>
                  Meet the companion that grows with you.
                </VoxaText>
                <VoxaText variant="supporting" color="textSecondary" style={styles.heroCopy}>
                  Talk, plan, reflect and build your life with an AI companion that gets to know you
                  over time.
                </VoxaText>
              </View>
            </FadeIn>
          ) : null}

          {step === 'basics' ? (
            <FadeIn>
              <View style={styles.stepBlock}>
                <VoxaText variant="display" style={styles.questionTitle}>
                  What should Voxa call you?
                </VoxaText>
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Your name"
                  placeholderTextColor={colors.textMuted}
                  style={styles.heroInput}
                  autoCapitalize="words"
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    if (validateOnboardingBasics(displayName) === null) next();
                  }}
                />
              </View>
            </FadeIn>
          ) : null}

          {step === 'createVoxa' ? (
            <FadeIn>
              <View style={styles.stepBlock}>
                <View style={styles.companionHero}>
                  <VoxaOrb size={companionOrbSize} tint={avatarAccent} active />
                </View>
                <VoxaText variant="sectionTitle" style={styles.sectionHeading}>
                  Create your Voxa
                </VoxaText>
                <TextInput
                  value={voxaName}
                  onChangeText={setVoxaName}
                  placeholder="Companion name"
                  placeholderTextColor={colors.textMuted}
                  style={styles.textInput}
                  autoCapitalize="words"
                  returnKeyType="done"
                />
                <VoxaText variant="label" color="textMuted">
                  Personality
                </VoxaText>
                <View style={styles.personalityRow}>
                  {ONBOARDING_PERSONALITY_OPTIONS.map((item) => (
                    <Pressable
                      key={item.id}
                      style={[
                        styles.personalityChip,
                        personalityChoice === item.id && styles.personalityChipActive,
                      ]}
                      onPress={() => setPersonalityChoice(item.id)}>
                      <VoxaText
                        variant="caption"
                        color={personalityChoice === item.id ? 'primarySoft' : 'textSecondary'}>
                        {item.label}
                      </VoxaText>
                    </Pressable>
                  ))}
                </View>
                <VoxaText variant="label" color="textMuted">
                  Appearance
                </VoxaText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.avatarCarousel}>
                  {VOXA_AVATARS.map((avatar) => (
                    <Pressable
                      key={avatar.id}
                      style={[
                        styles.avatarChip,
                        avatarId === avatar.id && { borderColor: avatar.accent },
                      ]}
                      onPress={() => setAvatarId(avatar.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: avatarId === avatar.id }}>
                      <VoxaOrb size={56} tint={avatar.accent} active={avatarId === avatar.id} />
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </FadeIn>
          ) : null}

          {step === 'reason' ? (
            <FadeIn>
              <View style={styles.stepBlock}>
                <VoxaText variant="display" style={styles.questionTitle}>
                  What would you like Voxa to help you with?
                </VoxaText>
                <VoxaText variant="supporting" color="textSecondary" style={styles.reasonHint}>
                  Choose up to 3. You can change these later.
                </VoxaText>
                <View style={styles.reasonList}>
                  {ONBOARDING_REASON_OPTIONS.map((reason) => {
                    const selected = selectedReasons.includes(reason);
                    const disabled = isOnboardingReasonDisabled(selectedReasons, reason);
                    return (
                      <Pressable
                        key={reason}
                        style={[
                          styles.reasonRow,
                          selected && styles.reasonRowActive,
                          disabled && styles.reasonRowDisabled,
                        ]}
                        onPress={() => setSelectedReasons((current) => toggleOnboardingReason(current, reason))}
                        disabled={disabled}
                        accessibilityRole="checkbox"
                        accessibilityState={{ selected, disabled }}>
                        <VoxaText variant="body" color={disabled ? 'textMuted' : 'text'}>
                          {reason}
                        </VoxaText>
                        {selected ? (
                          <Ionicons name="checkmark-circle" size={22} color={colors.primarySoft} />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </FadeIn>
          ) : null}

          {step === 'meetVoxa' ? (
            <FadeIn>
              <View style={[styles.heroBlock, compact && styles.heroBlockCompact]}>
                <VoxaOrb size={heroOrbSize} tint={avatarAccent} active />
                <VoxaText variant="display" style={styles.heroTitle}>
                  {voxaName.trim() || 'Voxa'} is ready.
                </VoxaText>
                <VoxaText variant="supporting" color="textSecondary" style={styles.heroCopy}>
                  {voxaName.trim() || 'Voxa'} will learn what matters to you as you talk — you&apos;re
                  always in control of what gets remembered.
                </VoxaText>
              </View>
            </FadeIn>
          ) : null}

          {error ? (
            <VoxaText variant="caption" color="danger" style={styles.error}>
              {error}
            </VoxaText>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.actions}>
            {stepIndex > 0 ? (
              <PrimaryButton label="Back" variant="ghost" onPress={back} />
            ) : (
              <View style={styles.backSpacer} />
            )}
            <PrimaryButton label={primaryLabel} onPress={next} disabled={isSaving} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

function getPrimaryButtonLabel(step: OnboardingStep, stepIndex: number, isSaving: boolean): string {
  if (step === 'welcome') return 'Get started';
  if (step === 'meetVoxa') return isSaving ? 'Saving...' : 'Start talking';
  if (stepIndex === ONBOARDING_STEPS.length - 1) return isSaving ? 'Saving...' : 'Finish';
  return 'Continue';
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  footer: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
    backgroundColor: colors.background,
  },
  progressTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  heroBlock: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  heroBlockCompact: {
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  heroTitle: { textAlign: 'center', maxWidth: 340 },
  heroCopy: { textAlign: 'center', maxWidth: 320 },
  stepBlock: { gap: spacing.lg, paddingTop: spacing.lg },
  questionTitle: { lineHeight: 36 },
  heroInput: {
    backgroundColor: 'transparent',
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingVertical: spacing.md12,
    color: colors.text,
    fontSize: 28,
    fontWeight: '600',
    minHeight: 52,
  },
  companionHero: { alignItems: 'center', marginBottom: spacing.sm },
  sectionHeading: { textAlign: 'center' },
  textInput: {
    backgroundColor: colors.surfaceQuiet,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md12,
    color: colors.text,
    fontSize: 17,
    minHeight: 52,
  },
  personalityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  personalityChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md12,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceQuiet,
    minWidth: '47%',
    alignItems: 'center',
  },
  personalityChipActive: {
    backgroundColor: 'rgba(45, 212, 191, 0.14)',
  },
  avatarCarousel: { gap: spacing.md, paddingVertical: spacing.sm },
  avatarChip: {
    padding: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  reasonList: { gap: spacing.sm },
  reasonHint: { marginBottom: spacing.sm },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md12,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceQuiet,
    minHeight: 52,
  },
  reasonRowActive: {
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
  },
  reasonRowDisabled: {
    opacity: 0.45,
  },
  actions: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  backSpacer: { flex: 1 },
  error: { textAlign: 'center', marginTop: spacing.sm },
});
