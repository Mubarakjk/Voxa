import { TrustedContact, VoiceSession } from '../../types';
import { VoxaRepositories } from '../contracts';

export type SafeCallEscalationLevel = 'none' | 'check_in' | 'wellbeing' | 'contact_trusted';

export type SafeCallState = {
  session: VoiceSession;
  elapsedSeconds: number;
  escalationLevel: SafeCallEscalationLevel;
  lastWellbeingPromptAt?: string;
  locationPlaceholder?: string;
};

export type SafeCallConfig = {
  safetyTimerMinutes: number;
  checkInIntervalMinutes: number;
  escalationAfterMinutes: number;
};

const DEFAULT_CONFIG: SafeCallConfig = {
  safetyTimerMinutes: 60,
  checkInIntervalMinutes: 15,
  escalationAfterMinutes: 30,
};

export class SafeCallEscalationService {
  constructor(
    private readonly repositories: VoxaRepositories,
    private readonly config: SafeCallConfig = DEFAULT_CONFIG,
  ) {}

  async listTrustedAndEmergency(userId: string) {
    const contacts = await this.repositories.trustedContacts.listContacts(userId);
    return {
      trusted: contacts.filter((item) => !item.isEmergency),
      emergency: contacts.filter((item) => item.isEmergency),
    };
  }

  evaluateEscalation(state: SafeCallState): SafeCallEscalationLevel {
    const minutes = state.elapsedSeconds / 60;

    if (minutes >= this.config.escalationAfterMinutes) {
      return 'contact_trusted';
    }
    if (minutes >= this.config.checkInIntervalMinutes * 2) {
      return 'wellbeing';
    }
    if (minutes >= this.config.checkInIntervalMinutes) {
      return 'check_in';
    }
    return 'none';
  }

  getWellbeingPrompt(level: SafeCallEscalationLevel): string | null {
    switch (level) {
      case 'check_in':
        return "I'm still here with you. Are you feeling okay? You can talk to me about anything.";
      case 'wellbeing':
        return 'I want to make sure you are alright. Would a short breathing pause help right now?';
      case 'contact_trusted':
        return "If you would like, we can note that a trusted contact could check in. You are not alone.";
      default:
        return null;
    }
  }

  getSafetyTimerRemainingSeconds(state: SafeCallState): number {
    return Math.max(0, this.config.safetyTimerMinutes * 60 - state.elapsedSeconds);
  }

  shouldAutoCheckIn(state: SafeCallState): boolean {
    const intervalSeconds = this.config.checkInIntervalMinutes * 60;
    return state.elapsedSeconds > 0 && state.elapsedSeconds % intervalSeconds === 0;
  }

  formatContactLine(contact: TrustedContact): string {
    const role = contact.isEmergency ? 'Emergency' : 'Trusted';
    return `${role}: ${contact.name}${contact.phone ? ` · ${contact.phone}` : ''}`;
  }

  getDisclaimer(): string {
    return 'Safe Call is a wellbeing companion feature — not emergency services. If you are in immediate danger, contact local emergency services.';
  }

  getLocationPlaceholder(): string {
    return 'Location sharing coming soon — placeholder only.';
  }
}

export function createSafeCallEscalationService(repositories: VoxaRepositories) {
  return new SafeCallEscalationService(repositories);
}

export const safeCallEscalationService = {
  getDisclaimer: () =>
    'Safe Call is a wellbeing companion feature — not emergency services. If you are in immediate danger, contact local emergency services.',
};
