import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '../components/ui/buttons';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { VoiceOrb } from '../components/ui/voice-orb';
import { CHAT_COMPANION_MODE_IDS, COMPANION_MODES } from '../constants/companion-modes';
import {
  PERSONALITY_STYLES,
  VOXA_AVATARS,
  VoxaAvatarId,
  PersonalityStyleId,
} from '../constants/companion-identity';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { listVoiceOptions, VoiceOptionId } from '../constants/voice-options';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { createDefaultCompanionControls } from '../types/relationship-personality';
import {
  CheckInStyle,
  CompanionModeId,
  NotificationPreference,
  VoicePersonality,
} from '../types';
import { notificationService } from '../services/notifications/notification-service';
import { getRoutineCoachService } from '../services/routine/routine-coach-service';
import { parseFlexibleTimeInput, validateAgeInput } from '../utils/time-parse';
import {
  previewVoiceOption,
  stopVoiceOptionPreview,
} from '../services/voice/voice-options-service';
import { getVoiceOption } from '../constants/voice-options';
import { trackEvent } from '../services/analytics/analytics-service';

const STEPS = [
  'welcome',
  'basics',
  'reason',
  'personality',
  'avatar',
  'voxaIdentity',
  'voice',
  'mode',
  'goals',
  'topics',
  'schedule',
  'notifications',
  'memory',
  'coaching',
  'preview',
  'complete',
] as const;

type Step = (typeof STEPS)[number];

const PERSONALITIES: { id: VoicePersonality; label: string }[] = [
  { id: 'warm_calm', label: 'Warm & calm' },
  { id: 'gentle', label: 'Gentle' },
  { id: 'energetic', label: 'Energetic' },
  { id: 'direct', label: 'Direct' },
];

const GOAL_OPTIONS = [
  { id: 'sleep', label: 'Sleep schedule' },
  { id: 'workout', label: 'Workout' },
  { id: 'study', label: 'Study' },
  { id: 'business', label: 'Business' },
] as const;

const TOPIC_SUGGESTIONS = ['Music', 'Fitness', 'Career', 'Relationships', 'Learning', 'Mindfulness'];

type OnboardingScreenProps = {
  onComplete: () => void;
};

type OnboardingDraft = {
  stepIndex: number;
  displayName: string;
  age: string;
  mainReason: string;
  personality: VoicePersonality;
  personalityStyle: PersonalityStyleId;
  avatarId: VoxaAvatarId;
  voxaName: string;
  voiceOptionId: VoiceOptionId;
  defaultMode: CompanionModeId;
  goalInterests: string[];
  topics: string[];
  wakeTime: string;
  sleepTime: string;
  skipSchedule: boolean;
  notificationPref: NotificationPreference;
  checkInStyle: CheckInStyle;
  memoryLevel: 'minimal' | 'balanced' | 'deep';
  subscriptionChoice?: 'explore_pro' | 'free' | null;
};

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { profile, services, refreshProfile } = useVoxa();
  const insets = useSafeAreaInsets();
  const [stepIndex, setStepIndex] = useState(0);
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [age, setAge] = useState('');
  const [mainReason, setMainReason] = useState('');
  const [personality, setPersonality] = useState<VoicePersonality>('warm_calm');
  const [personalityStyle, setPersonalityStyle] = useState<PersonalityStyleId>('warm');
  const [avatarId, setAvatarId] = useState<VoxaAvatarId>('orb_purple');
  const [voxaName, setVoxaName] = useState('Voxa');
  const [voiceOptionId, setVoiceOptionId] = useState<VoiceOptionId>('aurora');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [defaultMode, setDefaultMode] = useState<CompanionModeId>('friend');
  const [goalInterests, setGoalInterests] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [wakeTime, setWakeTime] = useState('07:00');
  const [sleepTime, setSleepTime] = useState('23:00');
  const [skipSchedule, setSkipSchedule] = useState(false);
  const [notificationPref, setNotificationPref] = useState<NotificationPreference>('gentle');
  const [checkInStyle, setCheckInStyle] = useState<CheckInStyle>('gentle');
  const [memoryLevel, setMemoryLevel] = useState<'minimal' | 'balanced' | 'deep'>('balanced');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);

  const step = STEPS[stepIndex];
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  useEffect(() => {
    trackEvent('onboarding_started');
    void (async () => {
      try {
        const draft = await services.storage.getItem<OnboardingDraft>(STORAGE_KEYS.onboardingDraft);
        if (draft && typeof draft === 'object' && typeof draft.stepIndex === 'number') {
          setStepIndex(Math.min(Math.max(0, draft.stepIndex), STEPS.length - 1));
          if (typeof draft.displayName === 'string') setDisplayName(draft.displayName);
          if (typeof draft.age === 'string') setAge(draft.age);
          if (typeof draft.mainReason === 'string') setMainReason(draft.mainReason);
          if (draft.personality) setPersonality(draft.personality);
          if (draft.personalityStyle) setPersonalityStyle(draft.personalityStyle);
          if (draft.avatarId) setAvatarId(draft.avatarId);
          if (typeof draft.voxaName === 'string') setVoxaName(draft.voxaName);
          if (draft.voiceOptionId) setVoiceOptionId(draft.voiceOptionId);
          if (draft.defaultMode) setDefaultMode(draft.defaultMode);
          if (Array.isArray(draft.goalInterests)) setGoalInterests(draft.goalInterests);
          if (Array.isArray(draft.topics)) setTopics(draft.topics);
          if (typeof draft.wakeTime === 'string') setWakeTime(draft.wakeTime);
          if (typeof draft.sleepTime === 'string') setSleepTime(draft.sleepTime);
          if (typeof draft.skipSchedule === 'boolean') setSkipSchedule(draft.skipSchedule);
          if (draft.notificationPref) setNotificationPref(draft.notificationPref);
          if (draft.checkInStyle) setCheckInStyle(draft.checkInStyle);
          if (draft.memoryLevel) setMemoryLevel(draft.memoryLevel);
        }
      } catch {
        await services.storage.removeItem(STORAGE_KEYS.onboardingDraft);
      }
      setDraftReady(true);
    })();
    return () => {
      void stopVoiceOptionPreview();
    };
  }, [services.storage]);

  useEffect(() => {
    if (!draftReady) return;
    const draft: OnboardingDraft = {
      stepIndex,
      displayName,
      age,
      mainReason,
      personality,
      personalityStyle,
      avatarId,
      voxaName,
      voiceOptionId,
      defaultMode,
      goalInterests,
      topics,
      wakeTime,
      sleepTime,
      skipSchedule,
      notificationPref,
      checkInStyle,
      memoryLevel,
    };
    void services.storage.setItem(STORAGE_KEYS.onboardingDraft, draft);
  }, [
    draftReady,
    stepIndex,
    displayName,
    age,
    mainReason,
    personality,
    personalityStyle,
    avatarId,
    voxaName,
    voiceOptionId,
    defaultMode,
    goalInterests,
    topics,
    wakeTime,
    sleepTime,
    skipSchedule,
    notificationPref,
    checkInStyle,
    memoryLevel,
    services.storage,
  ]);

  const toggleGoal = (id: string) => {
    setGoalInterests((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const toggleTopic = (topic: string) => {
    setTopics((current) =>
      current.includes(topic) ? current.filter((item) => item !== topic) : [...current, topic],
    );
  };

  const validateCurrentStep = (): boolean => {
    setError(null);

    if (step === 'basics') {
      const ageCheck = validateAgeInput(age);
      if (!ageCheck.valid) {
        setError(ageCheck.error);
        return false;
      }
    }

    if (step === 'schedule' && !skipSchedule) {
      const wake = parseFlexibleTimeInput(wakeTime);
      const sleep = parseFlexibleTimeInput(sleepTime);
      if (!wake) {
        setError('Wake time looks off. Try 7am, 07:00, or 7:30am.');
        return false;
      }
      if (!sleep) {
        setError('Sleep time looks off. Try 11pm, 23:00, or 11:30 pm.');
        return false;
      }
      setWakeTime(wake.formatted);
      setSleepTime(sleep.formatted);
    }

    return true;
  };

  const playVoicePreview = async (id: VoiceOptionId) => {
    setPreviewLoading(true);
    try {
      await previewVoiceOption(getVoiceOption(id));
    } finally {
      setPreviewLoading(false);
    }
  };

  const next = () => {
    if (!validateCurrentStep()) return;
    trackEvent('onboarding_step_completed', { step });

    if (stepIndex < STEPS.length - 1) {
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

  const skipAge = () => {
    setAge('');
    setError(null);
    if (stepIndex < STEPS.length - 1) setStepIndex((v) => v + 1);
  };

  const skipScheduleStep = () => {
    setSkipSchedule(true);
    setError(null);
    if (stepIndex < STEPS.length - 1) setStepIndex((v) => v + 1);
  };

  const finish = async () => {
    if (!profile) return;
    setIsSaving(true);
    setError(null);

    const ageCheck = validateAgeInput(age);
    const parsedWake = skipSchedule ? undefined : parseFlexibleTimeInput(wakeTime)?.formatted;
    const parsedSleep = skipSchedule ? undefined : parseFlexibleTimeInput(sleepTime)?.formatted;

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await services.repositories.userProfile.updateProfile({
        displayName: displayName.trim() || profile.displayName,
        age: ageCheck.valid && ageCheck.value != null ? ageCheck.value : undefined,
        mainReason: mainReason.trim() || undefined,
        timezone,
        onboardingComplete: true,
        preferences: {
          ...profile.preferences,
          voicePersonality: personality,
          selectedVoiceOptionId: voiceOptionId,
          checkInStyle,
          morningGreetingEnabled: notificationPref !== 'off',
          eveningReflectionEnabled: notificationPref !== 'off',
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
          voiceStyle: personality,
          replyLength: 'balanced',
        },
        onboarding: {
          age: ageCheck.valid && ageCheck.value != null ? ageCheck.value : undefined,
          mainReason: mainReason.trim() || undefined,
          favoriteTopics: topics,
          sleepSchedule:
            parsedWake && parsedSleep ? { wake: parsedWake, sleep: parsedSleep } : undefined,
          goalInterests,
          wantsWorkout: goalInterests.includes('workout'),
          wantsStudy: goalInterests.includes('study'),
          wantsBusiness: goalInterests.includes('business'),
          notificationPreference: notificationPref,
          checkInFrequency: checkInStyle === 'proactive' ? 'daily' : 'weekly',
        },
      });

      if (!skipSchedule && parsedWake && parsedSleep) {
        await getRoutineCoachService(services.storage, services.repositories).seedFromOnboarding(
          profile.id,
          { wake: parsedWake, sleep: parsedSleep },
        );
      }

      if (notificationPref !== 'off') {
        await notificationService.requestPermissions();
        await notificationService.scheduleDailyCheckIns(profile.id, {
          morningEnabled: true,
          eveningEnabled: notificationPref === 'proactive',
        });
      }

      await refreshProfile();
      await services.storage.removeItem(STORAGE_KEYS.onboardingDraft);
      await services.storage.setItem(STORAGE_KEYS.selectedVoiceOptionId, voiceOptionId);
      trackEvent('onboarding_completed', {
        voice: voiceOptionId,
      });

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save onboarding.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScreenShell padded={false} glow="none">
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
            <View style={styles.center}>
              <VoiceOrb size={120} />
              <VoxaText variant="title" style={styles.centerTitle}>
                Meet the companion that grows with you.
              </VoxaText>
              <VoxaText variant="body" color="textSecondary" style={styles.centerCopy}>
                Talk, plan, reflect and keep the things that matter in one place.
              </VoxaText>
            </View>
          ) : null}

          {step === 'basics' ? (
            <GlassCard style={styles.card}>
              <VoxaText variant="subtitle">What should I call you?</VoxaText>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder={profile?.displayName ?? 'Your name'}
                placeholderTextColor={colors.textMuted}
                style={styles.textInput}
                autoCapitalize="words"
                returnKeyType="next"
              />
              <VoxaText variant="subtitle">Age (optional)</VoxaText>
              <VoxaText variant="caption" color="textMuted">
                Type your age or pick a range — or skip entirely.
              </VoxaText>
              <TextInput
                value={age}
                onChangeText={setAge}
                placeholder="e.g. 28"
                placeholderTextColor={colors.textMuted}
                style={styles.textInput}
                keyboardType="number-pad"
                maxLength={3}
              />
              <View style={styles.chipRow}>
                {['18-24', '25-34', '35-44', '45+'].map((range) => (
                  <Pressable
                    key={range}
                    style={styles.chip}
                    onPress={() => setAge(range.split('-')[0])}>
                    <VoxaText variant="caption">{range}</VoxaText>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={skipAge} hitSlop={8}>
                <VoxaText variant="caption" color="primarySoft" style={styles.skipLink}>
                  Skip age
                </VoxaText>
              </Pressable>
            </GlassCard>
          ) : null}

          {step === 'reason' ? (
            <GlassCard style={styles.card}>
              <VoxaText variant="subtitle">What would make Voxa genuinely useful to you?</VoxaText>
              {[
                'Someone to talk to',
                'Staying organised',
                'Motivation and accountability',
                'Study and learning',
                'Career and business',
                'Fitness and healthy routines',
                'Notes and ideas',
                'Reflection and journaling',
                'A mix of everything',
              ].map((reason) => (
                <Pressable
                  key={reason}
                  style={[styles.option, mainReason === reason && styles.optionActive]}
                  onPress={() => setMainReason(reason)}>
                  <VoxaText variant="body">{reason}</VoxaText>
                </Pressable>
              ))}
            </GlassCard>
          ) : null}

          {step === 'voice' ? (
            <GlassCard style={styles.card}>
              <VoxaText variant="subtitle">How should Voxa sound?</VoxaText>
              <VoxaText variant="caption" color="textMuted">
                Preview a voice, then choose one. You can change this later in Settings.
              </VoxaText>
              {listVoiceOptions(false).map((option) => (
                <Pressable
                  key={option.id}
                  style={[styles.option, voiceOptionId === option.id && styles.optionActive]}
                  onPress={() => setVoiceOptionId(option.id)}>
                  <VoxaText variant="body">
                    {option.displayName} — {option.shortDescription}
                  </VoxaText>
                  <Pressable
                    onPress={() => void playVoicePreview(option.id)}
                    hitSlop={8}
                    accessibilityLabel={`Preview ${option.displayName}`}>
                    {previewLoading && voiceOptionId === option.id ? (
                      <ActivityIndicator color={colors.primarySoft} />
                    ) : (
                      <VoxaText variant="caption" color="primarySoft">
                        Preview
                      </VoxaText>
                    )}
                  </Pressable>
                </Pressable>
              ))}
            </GlassCard>
          ) : null}

          {step === 'preview' ? (
            <GlassCard style={styles.card}>
              <VoxaText variant="subtitle">Your companion preview</VoxaText>
              <VoxaText variant="body" color="textSecondary">
                Hi {displayName.trim() || 'there'}. I’ll keep things{' '}
                {personalityStyle.replace('_', ' ')}, help you stay consistent and speak using the{' '}
                {getVoiceOption(voiceOptionId).displayName} voice. I’ll remember your goals at a{' '}
                {memoryLevel} level, but I won’t save everything you say.
              </VoxaText>
              <VoxaText variant="caption" color="textMuted">
                Companion: {voxaName.trim() || 'Voxa'} · Check-ins: {checkInStyle} · Focus:{' '}
                {mainReason || 'your day'}
              </VoxaText>
              <Pressable onPress={() => setStepIndex(STEPS.indexOf('basics'))} hitSlop={8}>
                <VoxaText variant="caption" color="primarySoft" style={styles.skipLink}>
                  Edit earlier answers
                </VoxaText>
              </Pressable>
            </GlassCard>
          ) : null}

          {step === 'personality' ? (
            <GlassCard style={styles.card}>
              <VoxaText variant="subtitle">Preferred Voxa personality</VoxaText>
              {PERSONALITY_STYLES.map((item) => (
                <Pressable
                  key={item.id}
                  style={[styles.option, personalityStyle === item.id && styles.optionActive]}
                  onPress={() => setPersonalityStyle(item.id)}>
                  <VoxaText variant="body">{item.label}</VoxaText>
                  <VoxaText variant="caption" color="textMuted">
                    {item.description}
                  </VoxaText>
                </Pressable>
              ))}
            </GlassCard>
          ) : null}

          {step === 'avatar' ? (
            <GlassCard style={styles.card}>
              <VoxaText variant="subtitle">Choose Voxa's look</VoxaText>
              <View style={styles.avatarGrid}>
                {VOXA_AVATARS.map((avatar) => (
                  <Pressable
                    key={avatar.id}
                    style={[styles.avatarOption, avatarId === avatar.id && { borderColor: avatar.accent }]}
                    onPress={() => setAvatarId(avatar.id)}>
                    <VoiceOrb size={64} tint={avatar.accent} />
                    <VoxaText variant="caption">{avatar.label}</VoxaText>
                  </Pressable>
                ))}
              </View>
            </GlassCard>
          ) : null}

          {step === 'voxaIdentity' ? (
            <GlassCard style={styles.card}>
              <VoxaText variant="subtitle">Name your companion</VoxaText>
              <TextInput
                value={voxaName}
                onChangeText={setVoxaName}
                placeholder="Voxa"
                placeholderTextColor={colors.textMuted}
                style={styles.textInput}
              />
              <VoxaText variant="subtitle">Voice style</VoxaText>
              {PERSONALITIES.map((item) => (
                <Pressable
                  key={item.id}
                  style={[styles.option, personality === item.id && styles.optionActive]}
                  onPress={() => setPersonality(item.id)}>
                  <VoxaText variant="body">{item.label}</VoxaText>
                </Pressable>
              ))}
            </GlassCard>
          ) : null}

          {step === 'mode' ? (
            <GlassCard style={styles.card}>
              <VoxaText variant="subtitle">Default mode</VoxaText>
              {CHAT_COMPANION_MODE_IDS.map((modeId) => (
                <Pressable
                  key={modeId}
                  style={[styles.option, defaultMode === modeId && styles.optionActive]}
                  onPress={() => setDefaultMode(modeId)}>
                  <VoxaText variant="body">{COMPANION_MODES[modeId].shortLabel}</VoxaText>
                  <VoxaText variant="caption" color="textMuted">
                    {COMPANION_MODES[modeId].description}
                  </VoxaText>
                </Pressable>
              ))}
            </GlassCard>
          ) : null}

          {step === 'goals' ? (
            <GlassCard style={styles.card}>
              <VoxaText variant="subtitle">What would you like help with?</VoxaText>
              {GOAL_OPTIONS.map((item) => (
                <Pressable
                  key={item.id}
                  style={[styles.option, goalInterests.includes(item.id) && styles.optionActive]}
                  onPress={() => toggleGoal(item.id)}>
                  <VoxaText variant="body">{item.label}</VoxaText>
                </Pressable>
              ))}
            </GlassCard>
          ) : null}

          {step === 'topics' ? (
            <GlassCard style={styles.card}>
              <VoxaText variant="subtitle">Favourite topics</VoxaText>
              <View style={styles.chipRow}>
                {TOPIC_SUGGESTIONS.map((topic) => (
                  <Pressable
                    key={topic}
                    style={[styles.chip, topics.includes(topic) && styles.chipActive]}
                    onPress={() => toggleTopic(topic)}>
                    <VoxaText variant="caption">{topic}</VoxaText>
                  </Pressable>
                ))}
              </View>
            </GlassCard>
          ) : null}

          {step === 'schedule' ? (
            <GlassCard style={styles.card}>
              <VoxaText variant="subtitle">Sleep schedule (optional)</VoxaText>
              <VoxaText variant="caption" color="textMuted">
                Type times like 7am, 07:00, or 11:30 pm — or use quick picks.
              </VoxaText>

              <VoxaText variant="caption" color="textSecondary">
                Wake time
              </VoxaText>
              <TextInput
                value={wakeTime}
                onChangeText={setWakeTime}
                placeholder="7:00am or 07:00"
                placeholderTextColor={colors.textMuted}
                style={styles.textInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.chipRow}>
                {['06:30', '07:00', '07:30', '08:00'].map((time) => (
                  <Pressable key={time} style={styles.chip} onPress={() => setWakeTime(time)}>
                    <VoxaText variant="caption">{time}</VoxaText>
                  </Pressable>
                ))}
              </View>

              <VoxaText variant="caption" color="textSecondary">
                Sleep time
              </VoxaText>
              <TextInput
                value={sleepTime}
                onChangeText={setSleepTime}
                placeholder="11pm or 23:00"
                placeholderTextColor={colors.textMuted}
                style={styles.textInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.chipRow}>
                {['22:00', '23:00', '00:00'].map((time) => (
                  <Pressable key={time} style={styles.chip} onPress={() => setSleepTime(time)}>
                    <VoxaText variant="caption">{time}</VoxaText>
                  </Pressable>
                ))}
              </View>

              <VoxaText variant="caption" color="textMuted">
                Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </VoxaText>
              <Pressable onPress={skipScheduleStep} hitSlop={8}>
                <VoxaText variant="caption" color="primarySoft" style={styles.skipLink}>
                  Skip sleep schedule
                </VoxaText>
              </Pressable>
            </GlassCard>
          ) : null}

          {step === 'notifications' ? (
            <GlassCard style={styles.card}>
              <VoxaText variant="subtitle">Notification preference</VoxaText>
              {(['off', 'gentle', 'proactive'] as NotificationPreference[]).map((pref) => (
                <Pressable
                  key={pref}
                  style={[styles.option, notificationPref === pref && styles.optionActive]}
                  onPress={() => setNotificationPref(pref)}>
                  <VoxaText variant="body">{pref.charAt(0).toUpperCase() + pref.slice(1)}</VoxaText>
                </Pressable>
              ))}
              <VoxaText variant="subtitle">Check-in frequency</VoxaText>
              {(['gentle', 'proactive'] as CheckInStyle[]).map((style) => (
                <Pressable
                  key={style}
                  style={[styles.option, checkInStyle === style && styles.optionActive]}
                  onPress={() => setCheckInStyle(style)}>
                  <VoxaText variant="body">{style.charAt(0).toUpperCase() + style.slice(1)}</VoxaText>
                </Pressable>
              ))}
            </GlassCard>
          ) : null}

          {step === 'memory' ? (
            <GlassCard style={styles.card}>
              <VoxaText variant="subtitle">What may Voxa remember?</VoxaText>
              <VoxaText variant="body" color="textSecondary">
                You control what Voxa remembers. You can view, correct or delete memories at any time.
                Notes stay private unless you explicitly share them.
              </VoxaText>
              {(
                [
                  { id: 'minimal' as const, label: 'Nothing automatically', detail: 'Only what you pin or ask to save' },
                  { id: 'balanced' as const, label: 'Goals & preferences', detail: 'Recommended — useful without oversharing' },
                  { id: 'deep' as const, label: 'Richer conversation details', detail: 'More continuity across chats' },
                ] as const
              ).map((item) => (
                <Pressable
                  key={item.id}
                  style={[styles.option, memoryLevel === item.id && styles.optionActive]}
                  onPress={() => setMemoryLevel(item.id)}>
                  <VoxaText variant="body">{item.label}</VoxaText>
                  <VoxaText variant="caption" color="textMuted">
                    {item.detail}
                  </VoxaText>
                </Pressable>
              ))}
            </GlassCard>
          ) : null}

          {step === 'coaching' ? (
            <GlassCard style={styles.card}>
              <VoxaText variant="subtitle">Daily coaching & rituals</VoxaText>
              <VoxaText variant="body" color="textSecondary">
                Each morning and evening, Voxa offers a gentle check-in — focus for the day, reflection at night, and coaching adapted to your routines and goals.
              </VoxaText>
              {(
                [
                  { id: 'off' as const, label: 'Off', detail: 'No proactive check-ins' },
                  { id: 'gentle' as const, label: 'Gentle', detail: 'Morning & evening rituals when you open Voxa' },
                  { id: 'proactive' as const, label: 'Proactive', detail: 'More nudges and coaching prompts' },
                ] as const
              ).map((item) => (
                <Pressable
                  key={item.id}
                  style={[styles.option, checkInStyle === item.id && styles.optionActive]}
                  onPress={() => setCheckInStyle(item.id)}>
                  <VoxaText variant="body">{item.label}</VoxaText>
                  <VoxaText variant="caption" color="textMuted">
                    {item.detail}
                  </VoxaText>
                </Pressable>
              ))}
            </GlassCard>
          ) : null}

          {step === 'complete' ? (
            <GlassCard style={styles.card}>
              <View style={styles.completeOrb}>
                <VoiceOrb size={88} active />
              </View>
              <VoxaText variant="title" style={styles.completeTitle}>
                Welcome to Voxa.
              </VoxaText>
              <VoxaText variant="body" color="textSecondary" style={styles.completeBody}>
                Everything is ready. Let's start building your journey together.
              </VoxaText>
            </GlassCard>
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
            <PrimaryButton
              label={stepIndex === STEPS.length - 1 ? (isSaving ? 'Saving...' : 'Finish') : 'Continue'}
              onPress={next}
              disabled={isSaving}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
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
  center: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  centerTitle: { textAlign: 'center' },
  centerCopy: { textAlign: 'center', maxWidth: 300 },
  card: { gap: spacing.md },
  textInput: {
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
    minHeight: 48,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
  },
  option: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    gap: 4,
  },
  optionActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(45, 212, 191, 0.1)',
  },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center' },
  avatarOption: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    width: '45%',
  },
  actions: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  backSpacer: { flex: 1 },
  error: { textAlign: 'center', marginTop: spacing.sm },
  skipLink: { textAlign: 'center', paddingVertical: spacing.sm },
  completeOrb: { alignItems: 'center', paddingVertical: spacing.md },
  completeTitle: { textAlign: 'center' },
  completeBody: { textAlign: 'center', lineHeight: 24 },
});
