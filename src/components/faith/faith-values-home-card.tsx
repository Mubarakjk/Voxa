import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { StaggerFade } from '../premium/premium-ui';
import { VoxaText } from '../ui/voxa-text';
import { colors, layout, radius, spacing } from '../../constants/theme';
import { faithModeLabel, FaithValuesMode } from '../../types/faith-values';
import { hapticLight } from '../../utils/haptics';

type Props = {
  mode: FaithValuesMode;
  hasIntention: boolean;
  onPress: () => void;
};

export function FaithValuesHomeCard({ mode, hasIntention, onPress }: Props) {
  if (mode === 'off') return null;

  return (
    <StaggerFade index={2}>
      <Pressable
        style={styles.card}
        onPress={() => {
          void hapticLight();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel="Open Faith and Values">
        <View style={styles.iconWrap}>
          <Ionicons
            name={mode === 'islam' ? 'moon-outline' : 'leaf-outline'}
            size={18}
            color={colors.primarySoft}
          />
        </View>
        <View style={styles.copy}>
          <VoxaText variant="caption" color="textMuted">
            Faith & Values
          </VoxaText>
          <VoxaText variant="body" numberOfLines={1}>
            {hasIntention ? "Today's intention set" : faithModeLabel(mode)}
          </VoxaText>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </Pressable>
    </StaggerFade>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    minHeight: layout.minTapTarget + 8,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45, 212, 191, 0.1)',
  },
  copy: { flex: 1, gap: 2 },
});
