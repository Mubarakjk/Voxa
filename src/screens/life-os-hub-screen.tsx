import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { SectionCard } from '../components/premium/premium-ui';
import { GlassCard } from '../components/ui/glass-card';
import { VoxaText } from '../components/ui/voxa-text';
import { colors, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { getPhase5LifeOSService } from '../services/life-os/phase5-life-os-service';
import { LifeOSScreenShell } from '../components/phase5/life-os-screen-shell';

type LifeOSRoute = Extract<
  keyof RootStackParamList,
  | 'GoalDetail'
  | 'FutureSelf'
  | 'VisionBoard'
  | 'BucketList'
  | 'DreamJournal'
  | 'DecisionSimulator'
  | 'DebateMode'
  | 'CoachScore'
  | 'MemoryConnections'
  | 'LifeBook'
  | 'MemoryMovie'
>;

const FEATURES: Array<{ id: LifeOSRoute; title: string; icon: keyof typeof Ionicons.glyphMap; desc: string }> = [
  { id: 'GoalDetail', title: 'Goal Planner', icon: 'flag-outline', desc: 'Plans, milestones & next actions' },
  { id: 'FutureSelf', title: 'Future Self', icon: 'sparkles-outline', desc: 'Reflect on who you are becoming' },
  { id: 'VisionBoard', title: 'Vision Board', icon: 'images-outline', desc: 'Dreams, photos & progress' },
  { id: 'BucketList', title: 'Bucket List', icon: 'earth-outline', desc: 'Experiences & adventures' },
  { id: 'DreamJournal', title: 'Dream Journal', icon: 'moon-outline', desc: 'Private dream reflections' },
  { id: 'DecisionSimulator', title: 'Decision Simulator', icon: 'git-compare-outline', desc: 'Weigh options thoughtfully' },
  { id: 'DebateMode', title: 'Debate Mode', icon: 'chatbox-ellipses-outline', desc: 'Challenge your thinking' },
  { id: 'CoachScore', title: 'Coach Score', icon: 'stats-chart-outline', desc: 'Transparent progress domains' },
  { id: 'MemoryConnections', title: 'Memory Connections', icon: 'link-outline', desc: 'Connected recall' },
  { id: 'LifeBook', title: 'Life Book', icon: 'book-outline', desc: 'Monthly chapters from your history' },
  { id: 'MemoryMovie', title: 'Memory Movie', icon: 'film-outline', desc: 'Storyboard preview (video coming soon)' },
];

export function LifeOSHubScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, services } = useVoxa();
  const service = getPhase5LifeOSService(services.storage, services.repositories);

  useFocusEffect(
    useCallback(() => {
      if (profile) void service.refreshMemoryConnections(profile.id);
    }, [profile, service]),
  );

  return (
    <LifeOSScreenShell
      title="Life OS"
      subtitle="Build, understand, and remember your life — all connected.">
      <SectionCard title="Your planning toolkit" subtitle="Real data, local-first, syncs when available">
        <View style={styles.grid}>
          {FEATURES.map((feature) => (
            <GlassCard
              key={feature.id}
              style={styles.card}
              onPress={() => navigation.navigate(feature.id)}>
              <Ionicons name={feature.icon} size={22} color={colors.primarySoft} />
              <VoxaText variant="subtitle" style={styles.cardTitle}>
                {feature.title}
              </VoxaText>
              <VoxaText variant="caption" color="textMuted">
                {feature.desc}
              </VoxaText>
            </GlassCard>
          ))}
        </View>
      </SectionCard>
    </LifeOSScreenShell>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    width: '47%',
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardTitle: {
    marginTop: spacing.xs,
  },
});
