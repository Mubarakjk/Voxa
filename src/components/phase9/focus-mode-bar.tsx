import { Pressable, StyleSheet, View } from 'react-native';

import { GlassCard } from '../ui/glass-card';
import { VoxaText } from '../ui/voxa-text';
import { colors, radius, spacing } from '../../constants/theme';
import { FocusSession } from '../../types/phase9-intelligence';

type Props = {
  session: FocusSession;
  progressPercent: number;
  onEnd?: () => void;
};

export function FocusModeBar({ session, progressPercent, onEnd }: Props) {
  const remaining = Math.max(0, Math.ceil((new Date(session.endsAt).getTime() - Date.now()) / 60000));

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <VoxaText variant="caption" color="primarySoft">Focus · {session.label}</VoxaText>
        <VoxaText variant="caption" color="textMuted">{remaining}m left</VoxaText>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progressPercent}%` }]} />
      </View>
      {onEnd ? (
        <Pressable onPress={onEnd}>
          <VoxaText variant="caption" color="textMuted">End session</VoxaText>
        </Pressable>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, marginHorizontal: spacing.md, marginBottom: spacing.xs },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 4, borderRadius: radius.full, backgroundColor: colors.surface, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primarySoft, borderRadius: radius.full },
});
