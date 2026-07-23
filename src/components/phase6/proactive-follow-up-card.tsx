import { Pressable, StyleSheet } from 'react-native';

import { GlassCard } from '../ui/glass-card';
import { VoxaText } from '../ui/voxa-text';
import { colors, spacing } from '../../constants/theme';
import { ProactiveFollowUp } from '../../types/phase6-premium';

type Props = {
  followUp: ProactiveFollowUp;
  onRespond: () => void;
  onDismiss: () => void;
};

export function ProactiveFollowUpCard({ followUp, onRespond, onDismiss }: Props) {
  return (
    <GlassCard style={styles.card}>
      <VoxaText variant="label" color="primarySoft">Following up</VoxaText>
      <VoxaText variant="body" color="textSecondary">{followUp.prompt}</VoxaText>
      <Pressable onPress={onRespond} style={styles.respond}>
        <VoxaText variant="caption" color="primarySoft">Tell Voxa</VoxaText>
      </Pressable>
      <Pressable onPress={onDismiss} hitSlop={8}>
        <VoxaText variant="caption" color="textMuted">Not now</VoxaText>
      </Pressable>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.md },
  respond: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
});
