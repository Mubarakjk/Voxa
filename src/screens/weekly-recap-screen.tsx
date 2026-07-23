import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState, SectionCard } from '../components/premium/premium-ui';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { colors, layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { getWeeklyRecapService, WeeklyRecapData } from '../services/weekly-recap/weekly-recap-service';

export function WeeklyRecapScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, services } = useVoxa();
  const [recap, setRecap] = useState<WeeklyRecapData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const data = await getWeeklyRecapService(services.storage, services.repositories).buildRecap(profile.id);
    setRecap(data);
    setLoading(false);
  }, [profile, services]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={20} color={colors.primarySoft} />
          <VoxaText variant="caption" color="primarySoft">
            Back
          </VoxaText>
        </Pressable>

        <VoxaText variant="title">Weekly recap</VoxaText>
        <VoxaText variant="body" color="textSecondary" style={styles.subtitle}>
          What you and Voxa built together this week.
        </VoxaText>

        {loading ? (
          <VoxaText variant="body" color="textMuted">
            Gathering your week…
          </VoxaText>
        ) : !recap ? (
          <EmptyState
            icon="calendar-outline"
            title="Not enough data yet"
            message="Keep chatting, checking in, and building routines — your recap will appear when there is enough to reflect on."
          />
        ) : (
          <>
            <SectionCard title={recap.weekLabel} subtitle={recap.consistencyLabel}>
              <VoxaText variant="body" color="textSecondary">
                {recap.voxaNoticed}
              </VoxaText>
            </SectionCard>

            <SectionCard title="Wins">
              {recap.wins.map((win) => (
                <VoxaText key={win} variant="body" color="textSecondary">
                  · {win}
                </VoxaText>
              ))}
            </SectionCard>

            {recap.challenges.length > 0 ? (
              <SectionCard title="Challenges">
                {recap.challenges.map((item) => (
                  <VoxaText key={item} variant="body" color="textSecondary">
                    · {item}
                  </VoxaText>
                ))}
              </SectionCard>
            ) : null}

            <SectionCard title="Focus for next week" subtitle="One gentle direction">
              <VoxaText variant="body" color="textSecondary">
                {recap.suggestedFocus}
              </VoxaText>
            </SectionCard>

            <View style={styles.stats}>
              <Stat label="Chats" value={String(recap.stats.conversations)} />
              <Stat label="Routines" value={String(recap.stats.completedRoutines)} />
              <Stat label="Memories" value={String(recap.stats.memories)} />
              <Stat label="Check-ins" value={String(recap.stats.checkIns)} />
            </View>
          </>
        )}
      </ScrollView>
    </ScreenShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <VoxaText variant="subtitle">{value}</VoxaText>
      <VoxaText variant="caption" color="textMuted">
        {label}
      </VoxaText>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  subtitle: { marginBottom: spacing.md },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  stat: {
    minWidth: '42%',
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    gap: 4,
  },
});
