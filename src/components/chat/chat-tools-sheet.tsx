import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { colors, layout, radius, spacing } from '../../constants/theme';
import { COMPOSER_ACTIONS } from '../../services/phase12/composer-preferences-service';
import { ComposerAction } from '../../types/phase12-experiences';
import { VoxaText } from '../ui/voxa-text';

const PRIMARY_TOOL_IDS = [
  'just_listen',
  'help_plan',
  'motivate',
  'teach',
  'challenge_thinking',
  'coach_me',
  'focus_session',
  'add_reminder',
  'schedule_checkin',
  'start_challenge',
  'open_world',
] as const;

type ChatToolsSheetProps = {
  visible: boolean;
  onClose: () => void;
  onAction: (action: ComposerAction) => void;
};

export function ChatToolsSheet({ visible, onClose, onAction }: ChatToolsSheetProps) {
  const [showAll, setShowAll] = useState(false);

  const primaryTools = useMemo(
    () => PRIMARY_TOOL_IDS.map((id) => COMPOSER_ACTIONS.find((a) => a.id === id)).filter(Boolean) as ComposerAction[],
    [],
  );

  const tools = showAll ? COMPOSER_ACTIONS : primaryTools;

  const fire = (action: ComposerAction) => {
    setShowAll(false);
    onClose();
    onAction(action);
  };

  const close = () => {
    setShowAll(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <VoxaText variant="subtitle">{showAll ? 'More actions' : 'Tools'}</VoxaText>
          <VoxaText variant="caption" color="textMuted">
            Optional ways to steer the conversation
          </VoxaText>
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {tools.map((action) => (
              <Pressable
                key={action.id}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                onPress={() => fire(action)}>
                <Ionicons name={action.icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.primarySoft} />
                <VoxaText variant="body">{action.label}</VoxaText>
              </Pressable>
            ))}
            {!showAll ? (
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                onPress={() => setShowAll(true)}>
                <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
                <VoxaText variant="body" color="textSecondary">
                  More actions
                </VoxaText>
              </Pressable>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceStrong,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: layout.tabBarHeight + spacing.lg,
    gap: spacing.sm,
    maxHeight: '72%',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.glassBorder,
    marginBottom: spacing.sm,
  },
  list: { gap: spacing.xs, paddingTop: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  pressed: { backgroundColor: colors.surface },
});
