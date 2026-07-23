import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';

import { RootStackParamList } from '../navigation/types';
import { getProactiveCheckInOrchestrator } from '../services/proactive-check-ins';
import { VoxaServices } from '../services/contracts';
import { UserProfile } from '../types';

type Params = {
  profile: UserProfile | null;
  services: VoxaServices;
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList> | null>;
  enabled: boolean;
};

function openTalkFromNotification(
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList> | null>,
  starterPrompt: string,
) {
  const nav = navigationRef.current;
  if (!nav) return;
  nav.navigate('MainTabs', { screen: 'Talk', params: { starterPrompt } });
}

export function useProactiveCheckInNotifications({ profile, services, navigationRef, enabled }: Params) {
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !profile?.onboardingComplete) return;

    const orchestrator = getProactiveCheckInOrchestrator(services.storage, services.repositories);

    const handleResponse = async (response: Notifications.NotificationResponse | null) => {
      if (!response || !profile) return;
      const data = response.notification.request.content.data as Record<string, unknown>;
      if (data.kind !== 'proactive_check_in' && data.kind !== 'scheduled_check_in') return;

      const responseId = response.notification.request.identifier;
      if (handledRef.current === responseId) return;
      handledRef.current = responseId;

      const starterPrompt =
        typeof data.starterPrompt === 'string'
          ? data.starterPrompt
          : await orchestrator.handleNotificationOpen(profile.id, data);
      if (starterPrompt) openTalkFromNotification(navigationRef, starterPrompt);
    };

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      void handleResponse(response);
    });

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      void handleResponse(response);
    });

    const sync = () => {
      void orchestrator.sync(profile.id, profile);
    };

    sync();
    const appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') sync();
    });

    return () => {
      sub.remove();
      appStateSub.remove();
    };
  }, [enabled, profile, services.repositories, services.storage, navigationRef]);
}
