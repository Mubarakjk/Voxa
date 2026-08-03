import * as Haptics from 'expo-haptics';
import { AccessibilityInfo, Platform } from 'react-native';

let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled?.().then((v) => {
  reduceMotion = Boolean(v);
});
AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => {
  reduceMotion = Boolean(v);
});

async function run(fn: () => Promise<void>) {
  if (reduceMotion || Platform.OS === 'web') return;
  try {
    await fn();
  } catch {
    // Haptics unavailable on simulator / unsupported devices
  }
}

export async function hapticLight() {
  await run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export async function hapticMedium() {
  await run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

export async function hapticSuccess() {
  await run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export async function hapticWarning() {
  await run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

export async function hapticError() {
  await run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}

export async function hapticSelection() {
  await run(() => Haptics.selectionAsync());
}

export async function hapticCelebrate() {
  await run(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  });
}
