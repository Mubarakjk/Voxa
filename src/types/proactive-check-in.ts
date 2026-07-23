import { EntityId, ISODateString } from './common';

export type ProactiveInactivityHours = 1 | 3 | 6 | 12 | 24;

export type ProactiveCheckInTemplateKind = 'random' | 'contextual' | 'memory' | 'goal' | 'routine';

export type ProactiveCheckInSettings = {
  enabled: boolean;
  inactivityHours: ProactiveInactivityHours;
  lastActivityAt?: ISODateString;
  lastDeliveredAt?: ISODateString;
  pendingNotificationId?: string;
};

export type ProactiveCheckInDelivery = {
  id: EntityId;
  message: string;
  templateId: string;
  templateKind: ProactiveCheckInTemplateKind;
  deliveredAt: ISODateString;
};

export type ProactiveCheckInUserState = {
  settings: ProactiveCheckInSettings;
  history: ProactiveCheckInDelivery[];
};

export type ProactiveTemplateCandidate = {
  id: string;
  message: string;
  kind: ProactiveCheckInTemplateKind;
  priority: number;
};

export const PROACTIVE_INACTIVITY_OPTIONS: Array<{ hours: ProactiveInactivityHours; label: string }> = [
  { hours: 1, label: '1 hour' },
  { hours: 3, label: '3 hours' },
  { hours: 6, label: '6 hours' },
  { hours: 12, label: '12 hours' },
  { hours: 24, label: '24 hours' },
];

export function createDefaultProactiveCheckInSettings(): ProactiveCheckInSettings {
  return {
    enabled: true,
    inactivityHours: 6,
  };
}
