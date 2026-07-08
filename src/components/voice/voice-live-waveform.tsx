import { memo, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { colors } from '../../constants/theme';

type Props = {
  active: boolean;
  tint?: string;
  mode?: 'user' | 'voxa' | 'idle';
  intensity?: number;
};

function VoiceLiveWaveformComponent({ active, tint = colors.primarySoft, mode = 'idle', intensity = 0.5 }: Props) {
  const bars = useRef([...Array(12)].map(() => new Animated.Value(0.2))).current;

  useEffect(() => {
    if (!active) {
      bars.forEach((bar) => bar.setValue(0.12));
      return;
    }

    const animations = bars.map((bar, index) => {
      const peak = mode === 'voxa' ? 0.55 + intensity * 0.45 : mode === 'user' ? 0.4 + intensity * 0.5 : 0.35;
      const delay = index * 40;
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(bar, {
            toValue: peak + (index % 3) * 0.12,
            duration: 280 + (index % 4) * 60,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(bar, {
            toValue: 0.15 + (index % 2) * 0.08,
            duration: 280 + (index % 3) * 50,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ]),
      );
    });

    animations.forEach((anim) => anim.start());
    return () => animations.forEach((anim) => anim.stop());
  }, [active, bars, mode, intensity]);

  return (
    <View style={styles.row}>
      {bars.map((bar, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              backgroundColor: tint,
              height: bar.interpolate({ inputRange: [0, 1], outputRange: [6, 36] }),
              opacity: active ? 0.35 + (index % 4) * 0.15 : 0.12,
            },
          ]}
        />
      ))}
    </View>
  );
}

export const VoiceLiveWaveform = memo(VoiceLiveWaveformComponent);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, height: 40 },
  bar: { width: 4, borderRadius: 4 },
});
