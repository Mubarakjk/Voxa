import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { FadeIn, ScreenHeader, StaggerFade } from '../components/premium/premium-ui';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { getFaithValuesService } from '../services/faith/faith-values-service';
import { PRAYER_LABELS, PRAYER_ORDER, PrayerName, PrayerRoutineDay } from '../types/faith-values';
import { hapticLight, hapticSelection } from '../utils/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'PrayerRoutine'>;

export function PrayerRoutineScreen({ navigation }: Props) {
  const { profile, services } = useVoxa();
  const [today, setToday] = useState<PrayerRoutineDay | null>(null);
  const [week, setWeek] = useState<Array<{ date: string; count: number }>>([]);

  const load = useCallback(async () => {
    if (!profile) return;
    const service = getFaithValuesService(services.storage);
    const [day, summary] = await Promise.all([
      service.getPrayerDay(profile.id),
      service.getWeeklyPrayerSummary(profile.id),
    ]);
    setToday(day);
    setWeek(summary);
  }, [profile, services.storage]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const toggle = async (prayer: PrayerName) => {
    if (!profile) return;
    void hapticSelection();
    const next = await getFaithValuesService(services.storage).togglePrayer(profile.id, prayer);
    setToday(next);
    void load();
  };

  const completedCount = today
    ? PRAYER_ORDER.filter((p) => today.completed[p]).length
    : 0;

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <FadeIn>
          <ScreenHeader
            title="Prayer routine"
            subtitle="Manual tracking only — no prayer times or notifications."
          />
        </FadeIn>

        <GlassCard style={styles.noteCard}>
          <VoxaText variant="caption" color="textSecondary" style={styles.noteCopy}>
            Your faith journey is personal. This is here only to help you reflect and stay organised.
            Missed prayers are not failures.
          </VoxaText>
        </GlassCard>

        <VoxaText variant="label" color="textMuted">
          Today · {completedCount}/5
        </VoxaText>

        {PRAYER_ORDER.map((prayer, index) => {
          const done = Boolean(today?.completed[prayer]);
          return (
            <StaggerFade key={prayer} index={index}>
              <Pressable
                style={[styles.prayerRow, done && styles.prayerRowDone]}
                onPress={() => void toggle(prayer)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: done }}
                accessibilityLabel={`${PRAYER_LABELS[prayer]} prayer${done ? ', marked' : ''}`}>
                <Ionicons
                  name={done ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={done ? colors.primarySoft : colors.textMuted}
                />
                <VoxaText variant="body" style={styles.prayerLabel}>
                  {PRAYER_LABELS[prayer]}
                </VoxaText>
              </Pressable>
            </StaggerFade>
          );
        })}

        <VoxaText variant="label" color="textMuted" style={styles.weekLabel}>
          This week
        </VoxaText>
        <View style={styles.weekRow}>
          {week.map((day) => (
            <View key={day.date} style={styles.weekCell}>
              <VoxaText variant="caption" color="textMuted">
                {new Date(day.date).toLocaleDateString(undefined, { weekday: 'narrow' })}
              </VoxaText>
              <View style={[styles.weekDot, day.count > 0 && styles.weekDotActive]}>
                <VoxaText variant="caption" color={day.count > 0 ? 'primarySoft' : 'textMuted'}>
                  {day.count}
                </VoxaText>
              </View>
            </View>
          ))}
        </View>

        <Pressable
          style={styles.backLink}
          onPress={() => {
            void hapticLight();
            navigation.goBack();
          }}
          accessibilityRole="button"
          accessibilityLabel="Back to Faith and Values">
          <VoxaText variant="caption" color="primarySoft">
            Back to Faith & Values
          </VoxaText>
        </Pressable>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  noteCard: { padding: spacing.md },
  noteCopy: { lineHeight: 20 },
  prayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    minHeight: layout.minTapTarget,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  prayerRowDone: {
    borderColor: 'rgba(45, 212, 191, 0.25)',
    backgroundColor: 'rgba(45, 212, 191, 0.06)',
  },
  prayerLabel: { flex: 1 },
  weekLabel: { marginTop: spacing.md },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  weekCell: { alignItems: 'center', gap: spacing.xs, flex: 1 },
  weekDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  weekDotActive: {
    borderColor: 'rgba(45, 212, 191, 0.35)',
    backgroundColor: 'rgba(45, 212, 191, 0.1)',
  },
  backLink: {
    alignItems: 'center',
    minHeight: layout.minTapTarget,
    justifyContent: 'center',
    marginTop: spacing.md,
  },
});
