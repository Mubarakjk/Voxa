import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoodnightView } from '../components/ritual/goodnight-view';
import { RitualOverview } from '../components/ritual/ritual-overview';
import { PrimaryButton } from '../components/ui/buttons';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { invalidateDashboardCache } from '../hooks/use-cached-dashboard';
import { RootStackParamList } from '../navigation/types';
import { getDaysSinceLastVisit } from '../services/companion/companion-presence-service';
import {
  CheckInPeriod,
  getCheckInQuestions,
  getDailyCheckInService,
} from '../services/check-in/daily-check-in-service';
import { getCompanionJournalService } from '../services/journal/companion-journal-service';
import {
  buildEveningRitual,
  buildMorningRitual,
  getRitualService,
} from '../services/ritual/ritual-service';
import { EveningRitualContent, MorningRitualContent } from '../types/ritual';
import { getMoodIntelligenceService } from '../services/intelligence/mood-intelligence-service';
import { DAILY_MOOD_CHIPS, DailyMoodChipId, memoryMoodToIntelligence } from '../utils/daily-mood';
import { getVoxaAvatarTint } from '../utils/companion-display';
import { hapticCelebrate, hapticSelection } from '../utils/haptics';
import { SpringPressable } from '../components/premium/premium-ui';

type Props = NativeStackScreenProps<RootStackParamList, 'DailyCheckIn'>;
type Phase = 'overview' | 'questions' | 'goodnight';

export function DailyCheckInScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<Props['route']>();
  const insets = useSafeAreaInsets();
  const { profile, companion, services } = useVoxa();
  const period = (route.params?.period ?? 'morning') as CheckInPeriod;
  const questions = getCheckInQuestions(period);
  const [phase, setPhase] = useState<Phase>('overview');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [moodChip, setMoodChip] = useState<DailyMoodChipId | null>(null);
  const [customMood, setCustomMood] = useState('');
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState<MorningRitualContent | EveningRitualContent | null>(null);
  const [streaks, setStreaks] = useState(content && 'streaks' in content ? content.streaks : null);

  const loadContent = useCallback(async () => {
    if (!profile) return;
    const ritualService = getRitualService(services.storage);
    const cached = await ritualService.getCachedContent(period);
    if (cached) {
      setContent(cached);
      return;
    }

    const dashboard = await companion.getHomeDashboard(profile.id);
    const daysAway = await getDaysSinceLastVisit();
    const moodHistory = await getDailyCheckInService(services.storage).listMoodHistory();
    const morningEntry = await getDailyCheckInService(services.storage).getTodayEntry('morning');

    let built: MorningRitualContent | EveningRitualContent;
    if (period === 'morning') {
      built = buildMorningRitual({
        profile,
        goals: dashboard.activeGoals,
        memories: dashboard.memories,
        routine: dashboard.routineSummary,
        homeIntelligence: dashboard.homeIntelligence,
        relationshipScore: dashboard.wowExperience.relationshipScore,
        conversationCount: dashboard.wowExperience.conversationCount,
        daysTogether: dashboard.wowExperience.friendProfile.daysTogether,
        daysAway,
        moodHistory,
      });
    } else {
      built = buildEveningRitual({
        profile,
        goals: dashboard.activeGoals,
        memories: dashboard.memories,
        messages: dashboard.recentMessages,
        routine: dashboard.routineSummary,
        homeIntelligence: dashboard.homeIntelligence,
        relationshipScore: dashboard.wowExperience.relationshipScore,
        conversationCount: dashboard.wowExperience.conversationCount,
        daysTogether: dashboard.wowExperience.friendProfile.daysTogether,
        daysAway,
        morningEntry,
      });
    }

    const streakData = await ritualService.getStreaks();
    built = { ...built, streaks: streakData };
    await ritualService.setCachedContent(period, built);
    setContent(built);
    setStreaks(streakData);
  }, [profile, companion, services.storage, period]);

  useFocusEffect(
    useCallback(() => {
      void loadContent();
    }, [loadContent]),
  );

  const finish = async (skipped = false, remindLater = false) => {
    if (!profile) return;
    setSaving(true);
    try {
      const checkInService = getDailyCheckInService(services.storage);
      const ritualService = getRitualService(services.storage);

      if (remindLater) {
        await ritualService.remindLater(period);
        navigation.goBack();
        return;
      }

      const selectedMoodLabel =
        moodChip === 'custom'
          ? customMood.trim() || answers.mood
          : moodChip
            ? DAILY_MOOD_CHIPS.find((c) => c.id === moodChip)?.label
            : answers.mood;

      const entry = await checkInService.saveCheckIn({
        period,
        answers: {
          mood: selectedMoodLabel ?? answers.mood,
          focus: answers.priority ?? answers.focus,
          helpWith: answers.helpWith,
          lookingForward: answers.lookingForward,
          worrying: answers.worrying,
          priority: answers.priority,
          dayRating: answers.dayRating,
          wentWell: answers.smiled ?? answers.wentWell,
          wasDifficult: answers.wasDifficult,
          changeTomorrow: answers.tomorrowFeel ?? answers.changeTomorrow,
          smiled: answers.smiled,
          proud: answers.proud,
          remember: answers.remember,
          tomorrowFeel: answers.tomorrowFeel,
        },
        skipped,
        remindLater: false,
      });

      await ritualService.computeStreaks(await checkInService.listEntries());
      invalidateDashboardCache();

      if (!skipped) {
        if (entry.mood) {
          void getMoodIntelligenceService(services.storage).recordDetection({
            userId: profile.id,
            mood: memoryMoodToIntelligence(entry.mood),
            confidence: 0.92,
            source: 'check_in',
            label: selectedMoodLabel ?? entry.mood,
            snippet: selectedMoodLabel ?? entry.mood,
          });
        }
        const journal = getCompanionJournalService(services.storage, services.repositories);
        const journalBody = [
          period === 'morning' ? 'Morning ritual' : 'Evening reflection',
          answers.mood ?? answers.smiled ?? answers.proud,
          answers.priority ?? answers.lookingForward,
          answers.worrying ?? answers.wasDifficult,
          answers.remember ?? answers.tomorrowFeel,
        ]
          .filter(Boolean)
          .join(' · ');

        const today = new Date().toISOString().slice(0, 10);
        const entries = await journal.listEntries();
        const existing = entries.find((item) => item.date === today);
        if (existing) {
          await services.storage.setItem(
            STORAGE_KEYS.companionJournal,
            entries.map((item) =>
              item.id === existing.id
                ? { ...item, body: journalBody, mood: entry.mood, savedAt: new Date().toISOString() }
                : item,
            ),
          );
        } else {
          await journal.generateTodayNote(profile.id);
        }

        const memoryParts = [
          answers.remember,
          answers.proud,
          answers.smiled,
          answers.priority,
        ].filter(Boolean);

        if (memoryParts.length > 0 && (answers.remember || answers.proud)) {
          await services.repositories.memories.createMemory({
            userId: profile.id,
            category: 'emotional',
            title: period === 'morning' ? 'Morning ritual' : 'Evening reflection',
            content: memoryParts.join('. '),
            mood: entry.mood,
            importance: answers.remember ? 4 : 3,
            tags: ['ritual', period],
            source: 'check_in',
            occurredAt: new Date().toISOString(),
          });
        }

        if (content?.specialMoment?.showConfetti) void hapticCelebrate();
      }

      if (period === 'evening' && !skipped && phase !== 'goodnight') {
        setPhase('goodnight');
        setSaving(false);
        return;
      }

      navigation.goBack();
    } catch (err) {
      Alert.alert('Could not save', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const voxaTint = profile ? getVoxaAvatarTint(profile) : colors.primary;
  const isEvening = period === 'evening';
  const eveningContent = content && 'goodnightMessage' in content ? content : null;

  if (phase === 'goodnight' && eveningContent) {
    return (
      <ScreenShell padded={false} glow="blue">
        <GoodnightView message={eveningContent.goodnightMessage} voxaTint={voxaTint} />
        <View style={styles.goodnightFooter}>
          <PrimaryButton label="Goodnight" onPress={() => navigation.goBack()} />
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell padded={false} safeBottom={false} glow={isEvening ? 'blue' : undefined}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            isEvening && styles.eveningScroll,
            { paddingBottom: insets.bottom + spacing.xxxl },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
          {/* Tap blank form space to dismiss — children (chips/inputs/CTA) still receive presses. */}
          <Pressable style={styles.formBody} onPress={Keyboard.dismiss} accessible={false}>
            <Pressable onPress={() => navigation.goBack()} style={styles.back}>
              <Ionicons name="chevron-back" size={20} color={colors.primarySoft} />
              <VoxaText variant="caption" color="primarySoft">
                Back
              </VoxaText>
            </Pressable>

            {content ? (
              <>
                <VoxaText variant="title" style={styles.greeting}>
                  {content.greeting}
                </VoxaText>
                <VoxaText variant="body" color="textSecondary" style={styles.subGreeting}>
                  {content.subGreeting}
                </VoxaText>

                {streaks && streaks.combined > 0 ? (
                  <View style={styles.streakRow}>
                    <VoxaText variant="caption" color="primarySoft">
                      ☀ {streaks.morning}m · 🌙 {streaks.evening}e · {streaks.combined} combined
                    </VoxaText>
                  </View>
                ) : null}

                {phase === 'overview' ? (
                  <>
                    <RitualOverview period={period} content={content} />
                    <PrimaryButton
                      label={period === 'morning' ? 'Continue' : 'Begin reflection'}
                      onPress={() => {
                        Keyboard.dismiss();
                        setPhase('questions');
                      }}
                    />
                    <Pressable onPress={() => void finish(false, true)} style={styles.secondary}>
                      <VoxaText variant="caption" color="textMuted">
                        Remind me later
                      </VoxaText>
                    </Pressable>
                    <Pressable onPress={() => void finish(true)} style={styles.secondary}>
                      <VoxaText variant="caption" color="textMuted">
                        Skip for now
                      </VoxaText>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <View style={styles.field}>
                      <VoxaText variant="subtitle">How are you feeling today?</VoxaText>
                      <View style={styles.moodChips}>
                        {DAILY_MOOD_CHIPS.map((chip) => {
                          const active = moodChip === chip.id;
                          return (
                            <SpringPressable
                              key={chip.id}
                              onPress={() => {
                                Keyboard.dismiss();
                                void hapticSelection();
                                setMoodChip(chip.id);
                                if (chip.id !== 'custom' && chip.mood) {
                                  setAnswers((current) => ({ ...current, mood: chip.label }));
                                }
                              }}
                              style={active ? [styles.moodChip, styles.moodChipActive] : styles.moodChip}>
                              <VoxaText variant="caption" color={active ? 'primarySoft' : 'textMuted'}>
                                {chip.label}
                              </VoxaText>
                            </SpringPressable>
                          );
                        })}
                      </View>
                      {moodChip === 'custom' ? (
                        <TextInput
                          value={customMood}
                          onChangeText={(text) => {
                            setCustomMood(text);
                            setAnswers((current) => ({ ...current, mood: text }));
                          }}
                          placeholder="In your own words…"
                          placeholderTextColor={colors.textMuted}
                          style={styles.input}
                          returnKeyType="done"
                          blurOnSubmit
                          onSubmitEditing={Keyboard.dismiss}
                          accessibilityLabel="Custom mood"
                        />
                      ) : null}
                    </View>
                    {questions
                      .filter((question) => question.id !== 'mood')
                      .map((question) => (
                        <View key={question.id} style={styles.field}>
                          <VoxaText variant="subtitle">{question.label}</VoxaText>
                          <TextInput
                            value={answers[question.id] ?? ''}
                            onChangeText={(text) => setAnswers((current) => ({ ...current, [question.id]: text }))}
                            placeholder={question.placeholder}
                            placeholderTextColor={colors.textMuted}
                            style={styles.input}
                            multiline
                            blurOnSubmit={false}
                            textAlignVertical="top"
                            accessibilityLabel={question.label}
                          />
                        </View>
                      ))}
                    <PrimaryButton
                      label={period === 'morning' ? 'Start my day' : 'Save reflection'}
                      onPress={() => {
                        Keyboard.dismiss();
                        void finish(false);
                      }}
                      loading={saving}
                    />
                    <Pressable
                      onPress={() => {
                        Keyboard.dismiss();
                        setPhase('overview');
                      }}
                      style={styles.secondary}>
                      <VoxaText variant="caption" color="textMuted">
                        Back to overview
                      </VoxaText>
                    </Pressable>
                  </>
                )}
              </>
            ) : (
              <VoxaText variant="body" color="textMuted">
                Preparing your ritual…
              </VoxaText>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: layout.screenPadding,
  },
  formBody: {
    flexGrow: 1,
    gap: spacing.lg,
  },
  eveningScroll: { backgroundColor: colors.backgroundDeep },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  greeting: { marginTop: spacing.sm, lineHeight: 34 },
  subGreeting: { marginBottom: spacing.xs },
  streakRow: { alignSelf: 'flex-start' },
  field: { gap: spacing.sm },
  input: {
    minHeight: 72,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.surface,
    color: colors.text,
    padding: spacing.md,
    textAlignVertical: 'top',
  },
  secondary: { alignItems: 'center', paddingVertical: spacing.sm, minHeight: 44, justifyContent: 'center' },
  moodChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  moodChip: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.surfaceStrong,
  },
  moodChipActive: { borderColor: colors.primarySoft },
  goodnightFooter: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.backgroundDeep,
  },
});