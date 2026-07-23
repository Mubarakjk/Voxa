import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { colors, spacing } from '../../constants/theme';
import { VoxaText } from '../ui/voxa-text';

type Props = {
  spinning: boolean;
  onSpinEnd?: () => void;
};

export function SpinWheel({ spinning, onSpinEnd }: Props) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!spinning) return;
    rotation.setValue(0);
    Animated.timing(rotation, {
      toValue: 1,
      duration: 2600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onSpinEnd?.();
    });
  }, [spinning, onSpinEnd, rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '2160deg'],
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.pointer} />
      <Animated.View style={[styles.wheel, { transform: [{ rotate: spin }] }]}>
        {['XP', 'Quote', 'Talk', 'Fact', 'Teaser', 'Badge', 'Quest', 'Boost'].map((label, i) => (
          <View key={label} style={[styles.labelWrap, { transform: [{ rotate: `${i * 45}deg` }] }]}>
            <VoxaText variant="caption" style={styles.label}>{label}</VoxaText>
          </View>
        ))}
        <VoxaText variant="hero" style={styles.center}>🎡</VoxaText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', height: 200 },
  wheel: {
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 3,
    borderColor: colors.glassBorder,
    backgroundColor: colors.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { fontSize: 36, lineHeight: 44 },
  labelWrap: {
    position: 'absolute',
    top: 12,
    alignItems: 'center',
  },
  label: {
    fontSize: 9,
    color: colors.primarySoft,
  },
  pointer: {
    position: 'absolute',
    top: 4,
    zIndex: 2,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.text,
  },
});
