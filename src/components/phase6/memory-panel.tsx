import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { VoxaText } from '../ui/voxa-text';
import { colors, layout, spacing } from '../../constants/theme';
import { MemoryPanelItem } from '../../types/phase6-premium';

type Props = {
  visible: boolean;
  items: MemoryPanelItem[];
  onClose: () => void;
  onToggleInclude: (id: string) => void;
  onTogglePin?: (sourceId: string) => void;
};

export function MemoryPanel({ visible, items, onClose, onToggleInclude, onTogglePin }: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.shell}>
        <View style={styles.header}>
          <VoxaText variant="subtitle">Context for this chat</VoxaText>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>
        <VoxaText variant="caption" color="textMuted" style={styles.hint}>
          What Voxa is drawing on for this chat — memories, goals, and context.
        </VoxaText>
        <ScrollView contentContainerStyle={styles.list}>
          {items.length === 0 ? (
            <VoxaText variant="body" color="textMuted">No relevant context yet — keep chatting and Voxa will learn.</VoxaText>
          ) : (
            items.map((item) => (
              <View key={item.id} style={styles.row}>
                <View style={styles.rowMain}>
                  <VoxaText variant="caption" color="primarySoft">{item.kind}</VoxaText>
                  <VoxaText variant="subtitle">{item.label}</VoxaText>
                  <VoxaText variant="caption" color="textSecondary" numberOfLines={2}>{item.detail}</VoxaText>
                  {item.confidence && item.confidence !== 'high' ? (
                    <VoxaText variant="caption" color="textMuted">
                      {item.confidence === 'medium' ? 'Likely relevant' : 'May be outdated'}
                    </VoxaText>
                  ) : null}
                </View>
                <Ionicons
                  name={item.included ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={item.included ? colors.primarySoft : colors.textMuted}
                />
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.background, paddingTop: spacing.xl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
    marginBottom: spacing.sm,
  },
  hint: { paddingHorizontal: layout.screenPadding, marginBottom: spacing.md },
  list: { paddingHorizontal: layout.screenPadding, paddingBottom: spacing.xxl, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  rowMain: { flex: 1, gap: 2 },
});
