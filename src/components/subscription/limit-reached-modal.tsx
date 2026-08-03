import { isPaywallEnabled } from '../../config/launch-mode';
import { LIMIT_REACHED_COPY } from '../../constants/free-pro-access';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '../ui/buttons';
import { GlassCard } from '../ui/glass-card';
import { VoxaText } from '../ui/voxa-text';
import { colors, layout, radius, spacing } from '../../constants/theme';

type LimitReachedModalProps = {
  visible: boolean;
  message: string;
  onUpgrade: () => void;
  onContinueFree: () => void;
};

export function LimitReachedModal({
  visible,
  message,
  onUpgrade,
  onContinueFree,
}: LimitReachedModalProps) {
  if (!isPaywallEnabled()) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.backdrop} onPress={onContinueFree}>
        <Pressable style={styles.cardWrap} onPress={(event) => event.stopPropagation()}>
          <GlassCard style={styles.card}>
            <VoxaText variant="subtitle">{LIMIT_REACHED_COPY.title}</VoxaText>
            <VoxaText variant="body" color="textSecondary">
              {message}
            </VoxaText>
            <VoxaText variant="caption" color="textMuted">
              {LIMIT_REACHED_COPY.footer}
            </VoxaText>
            <View style={styles.actions}>
              <PrimaryButton label={LIMIT_REACHED_COPY.upgrade} onPress={onUpgrade} />
              <PrimaryButton label={LIMIT_REACHED_COPY.notNow} variant="ghost" onPress={onContinueFree} />
            </View>
          </GlassCard>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: layout.screenPadding,
  },
  cardWrap: { width: '100%' },
  card: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
});
