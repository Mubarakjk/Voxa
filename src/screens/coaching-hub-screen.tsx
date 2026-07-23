import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';

import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { ScreenHeader } from '../components/premium/premium-ui';
import { LoadingState } from '../components/ui/screen-state';
import { layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { COACH_DEFINITIONS, getCoachingService } from '../services/phase12/coaching-service';
import { CoachId } from '../types/phase12-experiences';

type Props = NativeStackScreenProps<RootStackParamList, 'CoachingHub'>;

export function CoachingHubScreen({ navigation }: Props) {
  const { profile, services } = useVoxa();
  const svc = getCoachingService(services.storage);
  const [activeId, setActiveId] = useState<CoachId | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const active = await svc.getActive(profile.id);
    setActiveId(active?.coachId ?? null);
    setLoading(false);
  }, [profile, svc]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const start = async (coachId: CoachId) => {
    if (!profile) return;
    await svc.start(profile.id, coachId, '');
    Alert.alert('Coaching started', 'Voxa is not a licensed professional — this is structured support.');
    navigation.navigate('MainTabs', {
      screen: 'Talk',
      params: { starterPrompt: COACH_DEFINITIONS.find((c) => c.id === coachId)?.starters[0], mode: 'coach' },
    });
  };

  if (loading) {
    return (
      <ScreenShell>
        <LoadingState label="Loading coaches..." />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader title="Specialist coaching" subtitle="Same Voxa memory — focused tone and boundaries per coach." />
        {COACH_DEFINITIONS.map((coach) => (
          <Pressable key={coach.id} onPress={() => void start(coach.id)}>
            <GlassCard style={styles.card}>
              <VoxaText variant="subtitle">{coach.name}{activeId === coach.id ? ' · Active' : ''}</VoxaText>
              <VoxaText variant="body" color="textSecondary">{coach.purpose}</VoxaText>
              <VoxaText variant="caption" color="textMuted">{coach.boundaries}</VoxaText>
            </GlassCard>
          </Pressable>
        ))}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: layout.screenPadding, paddingBottom: spacing.xxl, gap: spacing.sm },
  card: { gap: spacing.xs },
});
