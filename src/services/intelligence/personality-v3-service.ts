import { CompanionIntelligenceBundle } from '../../types/companion-intelligence';
import { ConversationSignals } from '../../types/phase3-intelligence';
import { PersonalityV3ModeLabel } from '../../types/phase4-intelligence';

const BUSINESS = /\b(startup|business|revenue|launch|investor|product|market|company|founder|voxa)\b/i;
const CREATIVE = /\b(idea|brainstorm|creative|design|write|story|concept|imagine|what if)\b/i;

export class PersonalityV3Service {
  inferModeFromMessage(
    userMessage: string,
    signals: ConversationSignals,
    bundle: CompanionIntelligenceBundle,
  ): PersonalityV3ModeLabel {
    const lower = userMessage.toLowerCase();

    if (BUSINESS.test(lower) || bundle.profile.productivityPatterns.some((p) => /business|startup/i.test(p))) {
      return 'business_partner';
    }
    if (CREATIVE.test(lower)) return 'creative_partner';
    if (signals.sportsRelated) return 'sports_friend';
    if (signals.needsSupport) return 'calm_listener';
    if (signals.wantsMotivation) return 'motivator';
    if (signals.intent === 'studying') return 'study_partner';
    if (signals.intent === 'planning' || signals.intent === 'problem_solving') return 'coach';

    return bundle.adaptive.lastModeLabel;
  }

  toPromptBlock(mode: PersonalityV3ModeLabel): string {
    switch (mode) {
      case 'business_partner':
        return 'Personality 3.0: Business partner — practical, strategic, honest, no fluff.';
      case 'creative_partner':
        return 'Personality 3.0: Creative brainstorming partner — playful ideation, build on their thoughts.';
      case 'calm_listener':
        return 'Personality 3.0: Calm listener — validate first, advise only when invited.';
      case 'motivator':
        return 'Personality 3.0: Motivator — belief, momentum, one clear next step.';
      case 'study_partner':
        return 'Personality 3.0: Study partner — patient, structured, checks understanding.';
      case 'sports_friend':
        return 'Personality 3.0: Sports friend — enthusiastic, facts vs opinions clearly separated.';
      default:
        return 'Personality 3.0: Warm friend — natural, specific, unscripted.';
    }
  }
}

export const personalityV3Service = new PersonalityV3Service();
