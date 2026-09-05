import { Platform } from 'react-native';
import { setAudioModeAsync } from 'expo-audio';

export type VoiceAudioRoute = 'speaker' | 'earpiece' | 'headphones' | 'bluetooth';

class VoiceAudioRouteService {
  private route: VoiceAudioRoute = 'speaker';

  getRoute() {
    return this.route;
  }

  getRouteLabel(route: VoiceAudioRoute = this.route): string {
    switch (route) {
      case 'speaker':
        return 'Speaker';
      case 'earpiece':
        return 'Earpiece';
      case 'headphones':
        return 'Headphones';
      case 'bluetooth':
        return 'Bluetooth';
      default:
        return 'Audio';
    }
  }

  async applyRoute(route: VoiceAudioRoute): Promise<void> {
    this.route = route;
    const throughEarpiece = route === 'earpiece';
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'duckOthers',
      shouldRouteThroughEarpiece: throughEarpiece,
    });
  }

  async setSpeakerEnabled(enabled: boolean): Promise<void> {
    await this.applyRoute(enabled ? 'speaker' : Platform.OS === 'ios' ? 'earpiece' : 'earpiece');
  }

  cycleRoute(): VoiceAudioRoute {
    const order: VoiceAudioRoute[] = ['speaker', 'earpiece', 'headphones', 'bluetooth'];
    const index = order.indexOf(this.route);
    const next = order[(index + 1) % order.length] ?? 'speaker';
    void this.applyRoute(next);
    return next;
  }
}

export const voiceAudioRouteService = new VoiceAudioRouteService();
