import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { colors, spacing } from '../../constants/theme';

type VoiceNoteWaveformProps = {
  active?: boolean;
  level?: number;
  barCount?: number;
};

export function VoiceNoteWaveform({ active = false, level = 0, barCount = 12 }: VoiceNoteWaveformProps) {
  const bars = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(0.25)),
  ).current;

  useEffect(() => {
    if (!active) {
      bars.forEach((bar) => bar.setValue(0.2));
      return;
    }

    const animations = bars.map((bar, index) => {
      const target = Math.max(0.15, Math.min(1, level * (0.6 + (index % 4) * 0.1) + Math.random() * 0.25));
      return Animated.timing(bar, {
        toValue: target,
        duration: 120 + index * 8,
        useNativeDriver: false,
      });
    });

    Animated.parallel(animations).start();
  }, [active, level, bars]);

  return (
    <View style={styles.wrap}>
      {bars.map((bar, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              height: bar.interpolate({
                inputRange: [0, 1],
                outputRange: [6, 28],
              }),
              opacity: active ? 1 : 0.45,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 32,
    flex: 1,
  },
  bar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.primarySoft,
  },
});
