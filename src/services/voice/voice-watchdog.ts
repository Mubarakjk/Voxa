import { VoiceConnectionState } from './voice-engine';
import { voiceLog } from './voice-debug-state';

export const VOICE_WATCHDOG_MS: Partial<Record<VoiceConnectionState, number>> = {
  connecting: 8_000,
  speaking: 15_000,
  thinking: 20_000,
  listening: 12_000,
};

export type VoiceWatchdogCallbacks = {
  onTimeout: (state: VoiceConnectionState, limitMs: number) => void;
};

export class VoiceWatchdog {
  private timer: ReturnType<typeof setInterval> | null = null;
  private state: VoiceConnectionState = 'idle';
  private enteredAt = 0;

  constructor(private readonly callbacks: VoiceWatchdogCallbacks) {}

  start() {
    this.stop();
    this.enteredAt = Date.now();
    this.timer = setInterval(() => this.tick(), 400);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  setState(state: VoiceConnectionState) {
    if (this.state === state) return;
    this.state = state;
    this.enteredAt = Date.now();
  }

  private tick() {
    const limit = VOICE_WATCHDOG_MS[this.state];
    if (!limit) return;
    if (Date.now() - this.enteredAt <= limit) return;
    voiceLog('VOICE WATCHDOG TIMEOUT', `${this.state} · ${limit}ms`);
    this.callbacks.onTimeout(this.state, limit);
    this.enteredAt = Date.now();
  }
}

export const VOICE_STUCK_MESSAGE = 'Voice got stuck. Tap Call to try again.';
