import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { PendingAttachmentInput } from '../../types';
import { VoxaText } from '../ui/voxa-text';

type AttachmentPreviewTrayProps = {
  attachments: PendingAttachmentInput[];
  onRemove: (index: number) => void;
};

export function AttachmentPreviewTray({ attachments, onRemove }: AttachmentPreviewTrayProps) {
  if (attachments.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tray}
      style={styles.container}>
      {attachments.map((item, index) => (
        <View key={`${item.localUri}-${index}`} style={styles.chip}>
          {item.type === 'image' || item.thumbnailUri ? (
            <Image source={{ uri: item.thumbnailUri ?? item.localUri }} style={styles.thumb} />
          ) : (
            <View style={styles.iconWrap}>
              <Ionicons
                name={
                  item.type === 'audio'
                    ? 'mic'
                    : item.type === 'video'
                      ? 'videocam'
                      : 'document'
                }
                size={18}
                color={colors.primarySoft}
              />
            </View>
          )}
          <VoxaText variant="caption" color="textSecondary" numberOfLines={1} style={styles.label}>
            {item.fileName ?? item.type}
          </VoxaText>
          <Pressable onPress={() => onRemove(index)} style={styles.removeBtn} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { maxHeight: 88 },
  tray: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    width: 96,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    gap: spacing.xs,
  },
  thumb: {
    width: '100%',
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  iconWrap: {
    width: '100%',
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 11 },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
});
