import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { EmptyState, PremiumButton, ScreenHeader } from '../components/premium/premium-ui';
import { LoadingState } from '../components/ui/screen-state';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { getMoodInsightsEngine, getMoodJournalService } from '../services/phase12/mood-journal-service';
import { MoodEntry, MoodInsight, MoodLevel } from '../types/phase12-experiences';

type Props = NativeStackScreenProps<RootStackParamList, 'MoodJournal'>;

function MoodPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: MoodLevel;
  onChange: (v: MoodLevel) => void;
}) {
  return (
    <View style={styles.pickerRow}>
      <VoxaText variant="caption" color="textMuted" style={styles.pickerLabel}>
        {label}
      </VoxaText>
      <View style={styles.pickerBtns}>
        {([1, 2, 3, 4, 5] as MoodLevel[]).map((n) => {
          const selected = value === n;
          return (
            <Pressable
              key={n}
              onPress={() => onChange(n)}
              style={[styles.scoreBtn, selected && styles.scoreBtnActive]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${label} ${n}`}>
              <VoxaText
                variant="caption"
                style={selected ? styles.scoreLabelActive : styles.scoreLabel}>
                {n}
              </VoxaText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function MoodJournalScreen({ navigation }: Props) {
  const { profile, services } = useVoxa();
  const journal = getMoodJournalService(services.storage);
  const insightsEngine = getMoodInsightsEngine(services.storage);
  const [today, setToday] = useState<MoodEntry | null>(null);
  const [insight, setInsight] = useState<MoodInsight | null>(null);
  const [mood, setMood] = useState<MoodLevel>(3);
  const [energy, setEnergy] = useState<MoodLevel>(3);
  const [stress, setStress] = useState<MoodLevel>(3);
  const [confidence, setConfidence] = useState<MoodLevel>(3);
  const [sleep, setSleep] = useState<MoodLevel>(3);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const [entry, entries] = await Promise.all([
      journal.getToday(profile.id),
      journal.list(profile.id, 30),
    ]);
    if (entry) {
      setToday(entry);
      setMood(entry.mood);
      setEnergy(entry.energy);
      setStress(entry.stress);
      setConfidence(entry.confidence);
      setSleep(entry.sleepQuality);
    }
    setInsight(await insightsEngine.generate(profile.id, entries, []));
    setLoading(false);
  }, [profile, journal, insightsEngine]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const save = async () => {
    if (!profile) return;
    await journal.save(profile.id, {
      date: new Date().toISOString().slice(0, 10),
      mood,
      energy,
      stress,
      confidence,
      sleepQuality: sleep,
      tags: [],
    });
    Alert.alert('Saved', 'Mood entry saved.');
    void load();
  };

  if (loading) {
    return (
      <ScreenShell>
        <LoadingState label="Loading mood journal..." />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          showBack
          title="Mood journal"
          subtitle="Quick check-in — insights need enough data. Not medical advice."
        />
        <PremiumButton
          label="View mood timeline"
          variant="ghost"
          onPress={() => navigation.navigate('MoodTimeline')}
        />
        <GlassCard style={styles.card}>
          <MoodPicker label="Mood" value={mood} onChange={setMood} />
          <MoodPicker label="Energy" value={energy} onChange={setEnergy} />
          <MoodPicker label="Stress" value={stress} onChange={setStress} />
          <MoodPicker label="Confidence" value={confidence} onChange={setConfidence} />
          <MoodPicker label="Sleep" value={sleep} onChange={setSleep} />
          <View style={styles.saveWrap}>
            <PremiumButton label={today ? 'Update today' : 'Save today'} onPress={() => void save()} />
          </View>
        </GlassCard>

        {insight ? (
          <GlassCard style={styles.insightCard}>
            <VoxaText variant="caption" color="primarySoft" style={styles.insightMeta}>
              Insight · {insight.confidence} · {insight.dataPoints} data points
            </VoxaText>
            <VoxaText variant="body" color="textSecondary" style={styles.insightLine}>
              {insight.line}
            </VoxaText>
            <VoxaText variant="caption" color="textMuted" style={styles.insightNext}>
              {insight.nextStep}
            </VoxaText>
            <PremiumButton
              label="Dismiss"
              variant="ghost"
              onPress={() => void insightsEngine.dismiss(insight.line).then(() => setInsight(null))}
            />
          </GlassCard>
        ) : (
          <GlassCard style={styles.emptyCard}>
            <EmptyState
              icon="analytics-outline"
              title="Insights building"
              message="Log a few more days to unlock grounded correlations."
            />
          </GlassCard>
        )}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: layout.screenPadding,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.md,
  },
  card: {
    gap: spacing.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  pickerRow: {
    gap: spacing.sm,
  },
  pickerLabel: {
    lineHeight: 18,
  },
  pickerBtns: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.sm,
  },
  scoreBtn: {
    flex: 1,
    minWidth: 0,
    aspectRatio: 1,
    maxHeight: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.28)',
  },
  scoreBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  scoreLabel: {
    color: colors.primarySoft,
    lineHeight: 18,
  },
  scoreLabelActive: {
    color: colors.background,
    lineHeight: 18,
  },
  saveWrap: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  insightCard: {
    gap: spacing.md12,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  insightMeta: { lineHeight: 18 },
  insightLine: { lineHeight: 22 },
  insightNext: { lineHeight: 18 },
  emptyCard: {
    padding: 0,
  },
});
