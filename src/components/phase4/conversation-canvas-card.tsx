import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { GlassCard } from '../ui/glass-card';
import { colors, spacing } from '../../constants/theme';
import { ConversationCanvas } from '../../types/phase4-intelligence';
import { VoxaText } from '../ui/voxa-text';

type ConversationCanvasCardProps = {
  canvas: ConversationCanvas;
  expanded?: boolean;
  onToggle?: () => void;
};

export function ConversationCanvasCard({ canvas, expanded, onToggle }: ConversationCanvasCardProps) {
  const visibleSections = expanded ? canvas.sections : canvas.sections.filter((s) => s.items.length > 0).slice(0, 3);

  return (
    <GlassCard style={styles.card}>
      <Pressable onPress={onToggle} style={styles.header}>
        <View style={styles.headerCopy}>
          <VoxaText variant="label" color="primarySoft">
            Workspace · {canvas.topic}
          </VoxaText>
          <VoxaText variant="caption" color="textMuted">
            {canvas.progressPercent}% mapped
          </VoxaText>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
      </Pressable>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${canvas.progressPercent}%` }]} />
      </View>

      {visibleSections.map((section) => (
        <View key={section.id} style={styles.section}>
          <VoxaText variant="caption" color="textMuted">
            {section.title}
          </VoxaText>
          {section.items.length > 0 ? (
            section.items.slice(0, expanded ? 6 : 2).map((item, index) => (
              <VoxaText key={`${section.id}-${index}`} variant="body" color="textSecondary">
                • {item}
              </VoxaText>
            ))
          ) : (
            <VoxaText variant="caption" color="textMuted">
              —
            </VoxaText>
          )}
        </View>
      ))}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: spacing.md, marginBottom: spacing.sm, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerCopy: { gap: 2 },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: `${colors.primarySoft}22`, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primarySoft },
  section: { gap: 4 },
});
