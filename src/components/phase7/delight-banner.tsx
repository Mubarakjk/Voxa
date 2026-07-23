import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GlassCard } from '../ui/glass-card';
import { VoxaText } from '../ui/voxa-text';
import { colors, spacing } from '../../constants/theme';
import { DelightMoment } from '../../types/phase4-intelligence';
import { FadeIn } from '../premium/premium-ui';

type Props = {
  moment: DelightMoment;
  onDismiss?: () => void;
};

export function DelightBanner({ moment, onDismiss }: Props) {
  return (
    <FadeIn>
      <GlassCard style={styles.card}>
        <View style={styles.header}>
          <Ionicons name="sparkles" size={18} color={colors.primarySoft} />
          <VoxaText variant="subtitle">{moment.title}</VoxaText>
          {onDismiss ? (
            <Pressable onPress={onDismiss} hitSlop={8}>
              <Ionicons name="close" size={16} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <VoxaText variant="body" color="textSecondary">{moment.message}</VoxaText>
        {moment.showConfetti ? (
          <VoxaText variant="caption" color="textMuted">✦ ✧ ✦</VoxaText>
        ) : null}
      </GlassCard>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, borderColor: `${colors.primarySoft}33` },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
