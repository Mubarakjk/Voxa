import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, View } from 'react-native';

import { SectionCard } from '../premium/premium-ui';
import { VoxaText } from '../ui/voxa-text';
import { colors, spacing } from '../../constants/theme';
import { RootStackParamList } from '../../navigation/types';
import { COACH_DOMAIN_LABELS, CoachScoreSnapshot, Phase5DashboardData } from '../../types/phase5-life-os';

type Props = {
  phase5: Phase5DashboardData;
};

export function CoachScoreCard({ phase5 }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const snapshot = phase5.coachScore;
  if (!snapshot) return null;

  const top = snapshot.scores
    .filter((s) => !s.hidden && s.confidence !== 'insufficient')
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  const hasData = top.length > 0;

  return (
    <SectionCard title="Coach Score" subtitle="Transparent progress from your data">
      {hasData ? (
        <View style={styles.row}>
          {top.map((entry) => (
            <View key={entry.domain} style={styles.pill}>
              <VoxaText variant="caption" color="primarySoft">{COACH_DOMAIN_LABELS[entry.domain]}</VoxaText>
              <VoxaText variant="subtitle">{entry.value}</VoxaText>
            </View>
          ))}
        </View>
      ) : (
        <VoxaText variant="body" color="textMuted">Not enough data yet.</VoxaText>
      )}
      <Pressable style={styles.link} onPress={() => navigation.navigate('CoachScore')}>
        <VoxaText variant="caption" color="primarySoft">View all domains</VoxaText>
        <Ionicons name="chevron-forward" size={14} color={colors.primarySoft} />
      </Pressable>
      <Pressable style={styles.link} onPress={() => navigation.navigate('LifeOSHub')}>
        <VoxaText variant="caption" color="primarySoft">Open Life OS</VoxaText>
        <Ionicons name="chevron-forward" size={14} color={colors.primarySoft} />
      </Pressable>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  pill: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.sm,
    minWidth: 90,
    alignItems: 'center',
  },
  link: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
});
