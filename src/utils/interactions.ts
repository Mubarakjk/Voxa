import { Alert } from 'react-native';

export const FAKE_VOXA_REPLIES = [
  "I'm here with you. Take your time.",
  "That makes a lot of sense. Tell me more.",
  "Thank you for sharing that with me.",
  "You don't have to figure it all out tonight.",
  "I remember how much this matters to you.",
  "Let's breathe together for a moment.",
  "You're doing better than you think.",
];

export function formatChatTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatDuration(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function pickFakeReply() {
  return FAKE_VOXA_REPLIES[Math.floor(Math.random() * FAKE_VOXA_REPLIES.length)];
}

export function showComingSoon(feature: string) {
  Alert.alert('Coming soon', `${feature} will be available in a future update.`);
}
