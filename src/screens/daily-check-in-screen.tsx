import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

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
import { getVoxaAvatarTint } from '../utils/companion-display';
import { hapticCelebrate } from '../utils/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'DailyCheckIn'>;
type Phase = 'overview' | 'questions' | 'goodnight';

export function DailyCheckInScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<Props['route']>();
  const { profile, companion, services } = useVoxa();
  const period = (route.params?.period ?? 'morning') as CheckInPeriod;
  const questions = getCheckInQuestions(period);
  const [phase, setPhase] = useState<Phase>('overview');
  const [answers, setAnswers] = useState<Record<string, string>>({});
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

      const entry = await checkInService.saveCheckIn({
        period,
        answers: {
          mood: answers.mood,
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
    <ScreenShell padded={false} glow={isEvening ? 'blue' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.scroll, isEvening && styles.eveningScroll]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
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
                  onPress={() => setPhase('questions')}
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
                {questions.map((question) => (
                  <View key={question.id} style={styles.field}>
                    <VoxaText variant="subtitle">{question.label}</VoxaText>
                    <TextInput
                      value={answers[question.id] ?? ''}
                      onChangeText={(text) => setAnswers((current) => ({ ...current, [question.id]: text }))}
                      placeholder={question.placeholder}
                      placeholderTextColor={colors.textMuted}
                      style={styles.input}
                      multiline
                    />
                  </View>
                ))}
                <PrimaryButton
                  label={period === 'morning' ? 'Start my day' : 'Save reflection'}
                  onPress={() => void finish(false)}
                  loading={saving}
                />
                <Pressable onPress={() => setPhase('overview')} style={styles.secondary}>
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
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xxl,
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
  secondary: { alignItems: 'center', paddingVertical: spacing.sm },
  goodnightFooter: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.backgroundDeep,
  },
});
