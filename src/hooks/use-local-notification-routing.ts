import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { NavigationContainerRef } from '@react-navigation/native';

import { RootStackParamList } from '../navigation/types';
import {
  EVENING_REFLECTION_ID,
  MORNING_GREETING_ID,
} from '../services/notifications/notification-service';

type Params = {
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList> | null>;
  enabled: boolean;
};

/**
 * Routes taps on daily rituals and user reminders.
 * Proactive/scheduled-check-in and scheduled-call hooks handle their own kinds.
 */
export function useLocalNotificationRouting({ navigationRef, enabled }: Params) {
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const openTalk = (starterPrompt?: string) => {
      const nav = navigationRef.current;
      if (!nav) return;
      try {
        nav.navigate('MainTabs', {
          screen: 'Talk',
          params: starterPrompt ? { starterPrompt } : undefined,
        });
      } catch {
        // Stale navigation tree — open app normally.
      }
    };

    const openReflection = () => {
      const nav = navigationRef.current;
      if (!nav) return;
      try {
        nav.navigate('DailyReflection');
      } catch {
        openTalk('How did today feel?');
      }
    };

    const handleResponse = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const id = response.notification.request.identifier;
      if (handledRef.current === id) return;

      const data = (response.notification.request.content.data ?? {}) as Record<string, unknown>;
      const kind = typeof data.kind === 'string' ? data.kind : '';

      // Owned by other hooks — skip.
      if (
        kind === 'proactive_check_in' ||
        kind === 'scheduled_check_in' ||
        kind === 'scheduled_call' ||
        data.scheduledCallId
      ) {
        return;
      }

      handledRef.current = id;

      try {
        if (id === EVENING_REFLECTION_ID || data.destination === 'reflection' || data.ritual === 'evening') {
          openReflection();
          return;
        }

        if (id === MORNING_GREETING_ID || data.destination === 'talk' || kind === 'daily_ritual') {
          const starter =
            typeof data.starterPrompt === 'string'
              ? data.starterPrompt
              : 'Good morning. How are you feeling today?';
          openTalk(starter);
          return;
        }

        if (typeof data.reminderId === 'string' || data.destination === 'reminder') {
          const title =
            typeof response.notification.request.content.title === 'string'
              ? response.notification.request.content.title
              : 'Reminder';
          openTalk(`About my reminder: ${title}`);
          return;
        }
      } catch {
        // Malformed payload — do not crash; app opens normally.
      }
    };

    void Notifications.getLastNotificationResponseAsync()
      .then((response) => handleResponse(response))
      .catch(() => undefined);

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      handleResponse(response);
    });

    return () => sub.remove();
  }, [enabled, navigationRef]);
}
