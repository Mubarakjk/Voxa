import { useVoxa } from '../context/voxa-context';
import {
  createVoiceCallController,
  VoiceCallControllerEvents,
} from '../services/voice/voice-call-controller';
import { VoiceConnectionState, VoiceTranscriptEntry } from '../services/voice/voice-engine';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useVoiceCallController() {
  const { companion, services } = useVoxa();
  const controllerRef = useRef<ReturnType<typeof createVoiceCallController> | null>(null);
  const [connectionState, setConnectionState] = useState<VoiceConnectionState>('idle');
  const [transcript, setTranscript] = useState<VoiceTranscriptEntry[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);

  const ensureController = useCallback(() => {
    const events: VoiceCallControllerEvents = {
      onStateChange: (state) => {
        setConnectionState(state);
        setIsActive(
          state === 'connecting' ||
            state === 'connected' ||
            state === 'listening' ||
            state === 'thinking' ||
            state === 'speaking' ||
            state === 'interrupted',
        );
        if (state === 'disconnected' || state === 'idle') {
          setIsActive(false);
        }
      },
      onTranscript: (entry) => {
        setTranscript((current) => [...current, entry]);
      },
      onTimerTick: (value) => setSeconds(value),
      onError: (err) => setError(err.message),
    };

    const controller = createVoiceCallController({
      companion,
      ai: services.ai,
      repositories: services.repositories,
      memoryEngine: services.memoryEngine,
      storage: services.storage,
      events,
    });
    controllerRef.current = controller;
    return controller;
  }, [companion, services]);

  useEffect(() => {
    ensureController();
    return () => {
      void controllerRef.current?.forceResetVoice();
    };
  }, [ensureController]);

  const startCall = useCallback(
    async (mode: import('../types').CompanionModeId = 'friend') => {
      const profile = await services.repositories.userProfile.getProfile();
      if (!profile) throw new Error('Profile not found.');
      setError(null);
      setTranscript([]);
      setSeconds(0);
      const controller = ensureController();
      await controller.startCall(profile.id, mode);
    },
    [ensureController, services.repositories.userProfile],
  );

  const startSafeCall = useCallback(async () => {
    const profile = await services.repositories.userProfile.getProfile();
    if (!profile) throw new Error('Profile not found.');
    setError(null);
    setTranscript([]);
    setSeconds(0);
    const controller = ensureController();
    await controller.startSafeCall(profile.id);
  }, [ensureController, services.repositories.userProfile]);

  const endCall = useCallback(async () => {
    const controller = controllerRef.current;
    if (!controller) return;
    await controller.endCall();
    setConnectionState('disconnected');
    setIsActive(false);
  }, []);

  const forceResetVoice = useCallback(async () => {
    const controller = ensureController();
    await controller.forceResetVoice();
    setConnectionState('disconnected');
    setIsActive(false);
  }, [ensureController]);

  const listCallHistory = useCallback(
    async (userId: string) => ensureController().listCallHistory(userId),
    [ensureController],
  );

  return {
    connectionState,
    transcript,
    seconds,
    error,
    isActive,
    startCall,
    startSafeCall,
    endCall,
    forceResetVoice,
    setMicMuted: (muted: boolean) => controllerRef.current?.setMicMuted(muted),
    setSpeakerEnabled: (enabled: boolean) => controllerRef.current?.setSpeakerEnabled(enabled),
    interrupt: () => controllerRef.current?.interrupt(),
    speakPrompt: (text: string) => controllerRef.current?.speakPrompt(text),
    testVoiceOutput: async () => {
      const controller = ensureController();
      setError(null);
      try {
        await controller.testVoiceOutput();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Voice test failed.';
        setError(message);
        throw err;
      }
    },
    testMicrophone: async () => {
      const controller = ensureController();
      setError(null);
      await controller.testMicrophone();
    },
    testSpeaker: async () => {
      const controller = ensureController();
      setError(null);
      await controller.testSpeaker();
    },
    resetAudio: async () => {
      const controller = ensureController();
      await controller.resetAudio();
      setConnectionState('disconnected');
      setIsActive(false);
      setError(null);
    },
    listCallHistory,
    controller: controllerRef,
  };
}
