import { FuturePlatformCapability, FuturePlatformStatus } from '../../types/phase9-intelligence';

/** Architecture stubs — not implemented; behind conceptual feature flags. */
export const FUTURE_PLATFORM_STATUSES: FuturePlatformStatus[] = [
  { capability: 'apple_watch', available: false, reason: 'Interface prepared — not shipped' },
  { capability: 'wear_os', available: false, reason: 'Interface prepared — not shipped' },
  { capability: 'desktop', available: false, reason: 'Interface prepared — not shipped' },
  { capability: 'carplay', available: false, reason: 'Interface prepared — not shipped' },
  { capability: 'siri_shortcuts', available: false, reason: 'Interface prepared — not shipped' },
  { capability: 'live_activities', available: false, reason: 'Interface prepared — not shipped' },
  { capability: 'calendar_sync', available: false, reason: 'Coming soon' },
  { capability: 'email_assistant', available: false, reason: 'Coming soon' },
  { capability: 'document_assistant', available: false, reason: 'Coming soon' },
];

export type IWatchCompanionBridge = {
  syncWidgetSnapshot(userId: string): Promise<void>;
};

export type IDesktopCompanionBridge = {
  openTalkDeepLink(prompt?: string): void;
};

export type ICarPlayBridge = {
  startVoiceSession(): Promise<void>;
};

export type ICalendarSyncBridge = {
  importEvents(userId: string): Promise<unknown[]>;
};

export function getFuturePlatformStatuses(): FuturePlatformStatus[] {
  return FUTURE_PLATFORM_STATUSES;
}
