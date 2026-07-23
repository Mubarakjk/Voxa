import { StyleSheet, View } from 'react-native';

import { colors } from '../../constants/theme';
import { VoxaText } from '../ui/voxa-text';

type RitualProgressRingProps = {
  percent: number;
  size?: number;
  morningDone?: boolean;
  eveningDone?: boolean;
};

function quadrantBorders(percent: number) {
  const active = colors.primarySoft;
  const inactive = 'rgba(255,255,255,0.08)';
  const p = Math.min(100, Math.max(0, percent)) / 100;
  return {
    borderTopColor: p > 0 ? active : inactive,
    borderRightColor: p > 0.25 ? active : inactive,
    borderBottomColor: p > 0.5 ? active : inactive,
    borderLeftColor: p > 0.75 ? active : inactive,
  };
}

export function RitualProgressRing({
  percent,
  size = 44,
  morningDone,
  eveningDone,
}: RitualProgressRingProps) {
  const stroke = 3;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <View
        style={[
          styles.track,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: stroke,
            ...quadrantBorders(percent),
          },
        ]}
      />
      <View style={styles.center}>
        <VoxaText variant="caption" color="primarySoft" style={styles.label}>
          {percent}%
        </VoxaText>
        <View style={styles.dots}>
          <View style={[styles.dot, morningDone && styles.dotDone]} />
          <View style={[styles.dot, eveningDone && styles.dotDone]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  track: {
    position: 'absolute',
  },
  center: { alignItems: 'center', gap: 2 },
  label: { fontSize: 10, fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 3 },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotDone: { backgroundColor: colors.primarySoft },
});
