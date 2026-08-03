import { useEffect, useMemo, useState } from 'react';

import {
  getRealtimeCallController,
  RealtimeCallSnapshot,
} from '../services/realtime-voice/realtime-call-controller';

const idleSnapshot: RealtimeCallSnapshot = {
  state: 'idle',
  statusText: 'Ready to call',
  errorMessage: null,
  startedAt: null,
  muted: false,
  captionsEnabled: true,
  caption: '',
  isActive: false,
};

export function useRealtimeCall() {
  const controller = useMemo(() => getRealtimeCallController(), []);
  const [snapshot, setSnapshot] = useState<RealtimeCallSnapshot>(idleSnapshot);

  useEffect(() => {
    return controller.subscribe(setSnapshot);
  }, [controller]);

  return {
    ...snapshot,
    startCall: controller.startCall.bind(controller),
    endCall: controller.endCall.bind(controller),
    resetForRetry: controller.resetForRetry.bind(controller),
    setMuted: controller.setMuted.bind(controller),
    setCaptionsEnabled: controller.setCaptionsEnabled.bind(controller),
  };
}
