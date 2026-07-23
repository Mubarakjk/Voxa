import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { ComposerAction, ComposerActionId } from '../../types/phase12-experiences';
import { VoxaText } from '../ui/voxa-text';
import { COMPOSER_ACTIONS, getComposerPreferencesService } from '../../services/phase12/composer-preferences-service';
import { IStorageService } from '../../services/contracts';

type Props = {
  userId: string;
  storage: IStorageService;
  favouriteIds: ComposerActionId[];
  onAction: (action: ComposerAction) => void;
};

export function PremiumComposerTray({ userId, storage, favouriteIds, onAction }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const shortcuts = useMemo(
    () => favouriteIds.map((id) => COMPOSER_ACTIONS.find((a) => a.id === id)).filter(Boolean) as ComposerAction[],
    [favouriteIds],
  );

  const results = useMemo(() => {
    const svc = getComposerPreferencesService(storage);
    return search.trim() ? svc.search(search) : COMPOSER_ACTIONS;
  }, [search, storage]);

  const fire = (action: ComposerAction) => {
    void getComposerPreferencesService(storage).recordUse(userId, action.id);
    setOpen(false);
    setSearch('');
    onAction(action);
  };

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {shortcuts.slice(0, 4).map((action) => (
          <Pressable key={action.id} style={({ pressed }) => [styles.chip, pressed && styles.pressed]} onPress={() => fire(action)}>
            <Ionicons name={action.icon as keyof typeof Ionicons.glyphMap} size={14} color={colors.primarySoft} />
            <VoxaText variant="caption" color="primarySoft">{action.label}</VoxaText>
          </Pressable>
        ))}
        <Pressable style={({ pressed }) => [styles.more, pressed && styles.pressed]} onPress={() => setOpen(true)}>
          <Ionicons name="grid-outline" size={14} color={colors.textMuted} />
          <VoxaText variant="caption" color="textMuted">More</VoxaText>
        </Pressable>
      </ScrollView>

      <Modal visible={open} transparent animationType="slide">
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <VoxaText variant="subtitle">Composer actions</VoxaText>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="/ Search actions..."
              placeholderTextColor={colors.textMuted}
              style={styles.search}
              autoCorrect={false}
            />
            <ScrollView style={styles.list}>
              {results.map((action) => (
                <Pressable key={action.id} style={styles.actionRow} onPress={() => fire(action)}>
                  <Ionicons name={action.icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.primarySoft} />
                  <View style={styles.actionCopy}>
                    <VoxaText variant="body">{action.label}</VoxaText>
                    <VoxaText variant="caption" color="textMuted" numberOfLines={1}>{action.instruction}</VoxaText>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.md },
  row: { gap: spacing.sm, paddingVertical: spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: `${colors.primarySoft}18`,
    borderWidth: 1,
    borderColor: `${colors.primarySoft}44`,
  },
  more: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  pressed: { opacity: 0.8 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surfaceStrong,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '70%',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  search: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.md,
    color: colors.text,
    minHeight: 44,
  },
  list: { maxHeight: 360 },
  actionRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', paddingVertical: spacing.md, minHeight: 44 },
  actionCopy: { flex: 1, gap: 2 },
});
