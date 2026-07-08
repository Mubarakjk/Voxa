import { ScrollView, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { VoiceTranscriptEntry } from '../../services/voice/voice-engine';
import { VoxaText } from '../ui/voxa-text';

type VoiceTranscriptPanelProps = {
  entries: VoiceTranscriptEntry[];
  voxaName: string;
};

export function VoiceTranscriptPanel({ entries, voxaName }: VoiceTranscriptPanelProps) {
  if (entries.length === 0) return null;

  const recent = entries.slice(-4);

  return (
    <View style={styles.wrap}>
      <VoxaText variant="label" color="textMuted" style={styles.label}>
        Transcript
      </VoxaText>
      <ScrollView style={styles.scroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
        {recent.map((entry) => (
          <View key={entry.id} style={styles.row}>
            <VoxaText variant="caption" color="primarySoft" numberOfLines={1}>
              {entry.role === 'user' ? 'You' : voxaName}
            </VoxaText>
            <VoxaText variant="caption" color="textSecondary" numberOfLines={2}>
              {entry.text}
            </VoxaText>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    maxWidth: 320,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    gap: spacing.xs,
  },
  label: { letterSpacing: 0.8 },
  scroll: { maxHeight: 96 },
  row: { gap: 2, marginBottom: spacing.xs },
});
