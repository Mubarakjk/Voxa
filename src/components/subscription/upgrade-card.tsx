import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { GlassCard } from '../ui/glass-card';
import { VoxaText } from '../ui/voxa-text';
import { colors, radius, spacing } from '../../constants/theme';

type UpgradeCardProps = {
  onPress: () => void;
  trialDaysLeft?: number;
};

export function UpgradeCard({ onPress, trialDaysLeft }: UpgradeCardProps) {
  return (
    <Pressable onPress={onPress}>
      <GlassCard variant="highlight" style={styles.card}>
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Ionicons name="diamond-outline" size={18} color={colors.primarySoft} />
          </View>
          <View style={styles.copy}>
            <VoxaText variant="body">Unlock Voxa Pro</VoxaText>
            <VoxaText variant="caption" color="textSecondary">
              {trialDaysLeft && trialDaysLeft > 0
                ? `${trialDaysLeft} days left in your trial`
                : 'Unlimited conversations, voice & premium intelligence'}
            </VoxaText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 124, 246, 0.15)',
  },
  copy: { flex: 1, gap: 2 },
});
