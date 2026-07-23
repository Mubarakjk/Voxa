import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GlassCard } from '../ui/glass-card';
import { VoxaText } from '../ui/voxa-text';
import { colors, spacing } from '../../constants/theme';
import { DynamicPresenceLine } from '../../types/phase7-signature';
import { FadeIn } from '../premium/premium-ui';

type Props = {
  presence: DynamicPresenceLine;
  stageLabel?: string;
  onRespond?: () => void;
};

export function DynamicPresenceCard({ presence, stageLabel, onRespond }: Props) {
  return (
    <FadeIn delay={30}>
      <GlassCard style={styles.card}>
        {stageLabel ? (
          <VoxaText variant="caption" color="primarySoft">{stageLabel}</VoxaText>
        ) : null}
        <VoxaText variant="body" color="textSecondary">{presence.line}</VoxaText>
        {onRespond ? (
          <Pressable style={styles.action} onPress={onRespond}>
            <VoxaText variant="caption" color="primarySoft">Continue the conversation</VoxaText>
            <Ionicons name="arrow-forward" size={14} color={colors.primarySoft} />
          </Pressable>
        ) : null}
      </GlassCard>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
});
