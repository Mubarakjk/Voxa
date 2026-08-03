import { StyleSheet, View } from 'react-native';

import { CountUpNumber } from '../premium/count-up-number';
import { VoxaText } from '../ui/voxa-text';
import { colors, radius, spacing } from '../../constants/theme';

type Props = {
  overall: number;
  size?: number;
  label?: string;
};

/** Lightweight score pulse — visual ring approximated with nested circles (no SVG dep). */
export function LifeScoreRing({ overall, size = 120, label = 'Life Score' }: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(overall)));
  const outer = size;
  const mid = size * 0.78;
  const inner = size * 0.56;

  return (
    <View
      style={[styles.wrap, { width: outer, height: outer }]}
      accessibilityRole="text"
      accessibilityLabel={`${label} ${clamped} out of 100`}>
      <View style={[styles.ring, { width: outer, height: outer, borderRadius: outer / 2, borderColor: colors.glassBorder }]} />
      <View
        style={[
          styles.ring,
          styles.mid,
          {
            width: mid,
            height: mid,
            borderRadius: mid / 2,
            borderColor: colors.primary,
            opacity: 0.35 + (clamped / 100) * 0.55,
          },
        ]}
      />
      <View
        style={[
          styles.core,
          {
            width: inner,
            height: inner,
            borderRadius: inner / 2,
          },
        ]}>
        <CountUpNumber value={clamped} style={styles.value} />
        <VoxaText variant="caption" color="textMuted" style={styles.label}>
          {label}
        </VoxaText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    borderWidth: 3,
    backgroundColor: 'transparent',
  },
  mid: {},
  core: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceStrong,
    gap: 2,
  },
  value: { fontSize: 28, lineHeight: 32, color: colors.primarySoft },
  label: { letterSpacing: 0.4 },
});
