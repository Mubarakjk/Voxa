import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '../ui/buttons';
import { GlassCard } from '../ui/glass-card';
import { VoxaText } from '../ui/voxa-text';
import { PRICING_CONFIG } from '../../constants/pricing';
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
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.backdrop} onPress={onContinueFree}>
        <Pressable style={styles.cardWrap} onPress={(event) => event.stopPropagation()}>
          <GlassCard style={styles.card}>
            <VoxaText variant="subtitle">You have reached today&apos;s limit</VoxaText>
            <VoxaText variant="body" color="textSecondary">
              {message}
            </VoxaText>
            <VoxaText variant="caption" color="textMuted">
              Free limits reset daily. Upgrade to Pro for unlimited access, or continue tomorrow.
            </VoxaText>
            <View style={styles.actions}>
              <PrimaryButton label="Upgrade to Pro" onPress={onUpgrade} />
              <PrimaryButton
                label="Continue Free tomorrow"
                variant="ghost"
                onPress={onContinueFree}
              />
            </View>
            <VoxaText variant="caption" color="textMuted" style={styles.trialHint}>
              Try {PRICING_CONFIG.trialDays} days free — no payment required yet.
            </VoxaText>
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
  trialHint: { textAlign: 'center' },
});
