import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated } from 'react-native';

import { VoxaText } from '../ui/voxa-text';

type Props = {
  value: number;
  durationMs?: number;
  style?: object;
};

/** Subtle count-up for scores / progress. Respects Reduce Motion. */
export function CountUpNumber({ value, durationMs = 700, style }: Props) {
  const [display, setDisplay] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;
  const reduceMotion = useRef(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled?.().then((v) => {
      reduceMotion.current = Boolean(v);
    });
  }, []);

  useEffect(() => {
    if (reduceMotion.current) {
      setDisplay(value);
      return;
    }
    anim.setValue(0);
    const id = anim.addListener(({ value: v }) => {
      setDisplay(Math.round(v));
    });
    Animated.timing(anim, {
      toValue: value,
      duration: durationMs,
      useNativeDriver: false,
    }).start();
    return () => {
      anim.removeListener(id);
    };
  }, [value, durationMs, anim]);

  return (
    <VoxaText variant="title" style={style}>
      {display}
    </VoxaText>
  );
}
