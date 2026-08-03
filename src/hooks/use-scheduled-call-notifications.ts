import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';

import { isScheduledCallsEnabled } from '../config/scheduled-calls';
import { isRealtimeVoiceEnabled } from '../config/realtime-voice';
import { RootStackParamList } from '../navigation/types';
import { getScheduledCallService } from '../services/scheduled-calls/scheduled-call-service';
import {
  SCHEDULED_CALL_ACTIONS,
  SCHEDULED_CALL_NOTIFICATION_KIND,
} from '../types/scheduled-companion-call';
import { VoxaServices } from '../services/contracts';
import { UserProfile } from '../types';
import { getVoxaDisplayName } from '../utils/companion-display';

type Params = {
  profile: UserProfile | null;
  services: VoxaServices;
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList> | null>;
  enabled: boolean;
};

function openScheduledRealtimeCall(
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList> | null>,
  scheduledCallId: string,
  autoStart: boolean,
) {
  const nav = navigationRef.current;
  if (!nav) return;
  if (!isRealtimeVoiceEnabled()) {
    nav.navigate('MainTabs', {
      screen: 'Talk',
      params: {
        starterPrompt: 'I answered my scheduled companion call. Can we talk about it here instead?',
      },
    });
    return;
  }
  nav.navigate('RealtimeCall', {
    autoStart,
    scheduledCallId,
    fromScheduledCall: true,
  });
}

export function useScheduledCallNotifications({ profile, services, navigationRef, enabled }: Params) {
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !isScheduledCallsEnabled() || !profile?.onboardingComplete) return;

    const svc = getScheduledCallService(services.storage);
    const companionName = getVoxaDisplayName(profile);

    const handleResponse = async (response: Notifications.NotificationResponse | null) => {
      if (!response || !profile) return;
      const data = response.notification.request.content.data as Record<string, unknown>;
      if (data.kind !== SCHEDULED_CALL_NOTIFICATION_KIND) return;

      const responseKey = `${response.notification.request.identifier}:${response.actionIdentifier}`;
      if (handledRef.current === responseKey) return;
      handledRef.current = responseKey;

      const scheduledCallId = typeof data.scheduledCallId === 'string' ? data.scheduledCallId : null;
      if (!scheduledCallId) return;

      const action = response.actionIdentifier;
      const autoStart = data.autoStartRealtime !== false;

      if (action === SCHEDULED_CALL_ACTIONS.snooze) {
        await svc.handleSnooze(profile.id, scheduledCallId, companionName);
        return;
      }

      if (action === SCHEDULED_CALL_ACTIONS.decline) {
        await svc.handleDecline(profile.id, scheduledCallId, companionName);
        return;
      }

      // Default tap or ANSWER_CALL — navigate only; RealtimeCall marks answered after open.
      // Never start the microphone from this handler — only the Call screen may.
      openScheduledRealtimeCall(navigationRef, scheduledCallId, autoStart);
    };

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      void handleResponse(response);
    });

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      void handleResponse(response);
    });

    const reconcile = () => {
      void svc.reconcile(profile.id, companionName);
    };

    reconcile();
    const appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') reconcile();
    });

    return () => {
      sub.remove();
      appStateSub.remove();
    };
  }, [enabled, profile, services.storage, navigationRef]);
}
