import { Easing } from 'react-native';

/** Shared premium motion tokens — use everywhere for consistent feel. */
export const PREMIUM_MOTION = {
  fadeIn: { duration: 320, easing: Easing.out(Easing.cubic) },
  fadeInSlow: { duration: 480, easing: Easing.out(Easing.cubic) },
  slideUp: { distance: 12, duration: 340 },
  staggerDelay: 60,
  spring: { friction: 7, tension: 120 },
  buttonScale: { pressIn: 0.96, duration: 120 },
  ripple: { duration: 400 },
  heroReveal: { duration: 520, delay: 80 },
  messageEnter: { duration: 280, slide: 8 },
  cardEnter: { duration: 360, slide: 14 },
} as const;

export function staggerDelay(index: number, base = PREMIUM_MOTION.staggerDelay): number {
  return Math.min(index * base, 400);
}
