import { useEffect, useState } from 'react';

import { audioSessionManager } from '../services/audio/audio-session-manager';
import { VoiceConnectionState } from '../services/voice/voice-engine';

export function useVoiceMetering(connectionState: VoiceConnectionState, active: boolean) {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!active || connectionState !== 'listening') {
      setLevel(0);
      return;
    }

    const timer = setInterval(() => {
      void audioSessionManager.getRecordingMetering().then(setLevel);
    }, 80);
    return () => clearInterval(timer);
  }, [active, connectionState]);

  return level;
}
