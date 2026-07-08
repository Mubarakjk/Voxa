import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '../../constants/theme';
import { VoiceSession } from '../../types';
import { formatDuration } from '../../utils/interactions';
import { GlassCard } from '../ui/glass-card';
import { VoxaText } from '../ui/voxa-text';

type VoiceCallHistoryProps = {
  sessions: VoiceSession[];
  onSelect?: (session: VoiceSession) => void;
};

export function VoiceCallHistory({ sessions, onSelect }: VoiceCallHistoryProps) {
  if (sessions.length === 0) {
    return (
      <VoxaText variant="caption" color="textMuted" style={styles.empty}>
        No call history yet
      </VoxaText>
    );
  }

  return (
    <View style={styles.wrap}>
      <VoxaText variant="label" color="textMuted">
        Recent calls
      </VoxaText>
      {sessions.map((session) => (
        <Pressable key={session.id} onPress={() => onSelect?.(session)}>
          <GlassCard style={styles.row}>
            <View style={styles.copy}>
              <VoxaText variant="body">
                {session.isSafeCall ? 'Safe Call' : session.mode.replace('_', ' ')}
              </VoxaText>
              <VoxaText variant="caption" color="textSecondary">
                {new Date(session.endedAt ?? session.updatedAt).toLocaleString()} ·{' '}
                {formatDuration(session.durationSeconds)}
              </VoxaText>
            </View>
            <VoxaText variant="caption" color="textMuted">
              {session.transcriptMessageIds.length} msgs
            </VoxaText>
          </GlassCard>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 340, gap: spacing.sm },
  empty: { textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderColor: colors.glassBorder,
  },
  copy: { flex: 1, gap: 2 },
});
