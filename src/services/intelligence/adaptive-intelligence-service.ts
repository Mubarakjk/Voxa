import { CompanionIntelligenceBundle } from '../../types/companion-intelligence';
import { Goal, Memory } from '../../types';
import {
  ADAPTIVE_MODE_LABELS,
  AdaptiveModeLabel,
  ConversationSignals,
  ResponsePlan,
  adaptiveModeToCompanionMode,
} from '../../types/phase3-intelligence';
import { MoodHistoryEntry } from '../check-in/daily-check-in-service';
import { emotionalAwarenessEngine } from './emotional-awareness-engine';
import { knowledgeGraphEngine } from './knowledge-graph-engine';
import { modeInferenceEngine } from './mode-inference-engine';
import { sportsIntelligenceEngine } from './sports-intelligence-engine';
import { TodayRoutineSummary } from '../../types/routine';

export type PlanResponseInput = {
  userMessage: string;
  bundle: CompanionIntelligenceBundle;
  memories: Memory[];
  goals: Goal[];
  moodHistory: MoodHistoryEntry[];
  routine?: TodayRoutineSummary | null;
  online?: boolean;
};

export class AdaptiveIntelligenceService {
  async planResponse(input: PlanResponseInput): Promise<{
    signals: ConversationSignals;
    plan: ResponsePlan;
    graphPrompt: string;
  }> {
    const signals = modeInferenceEngine.inferSignals(input.userMessage, input.bundle);
    const modeLabel = modeInferenceEngine.inferModeLabel(signals, input.bundle);
    const companionMode = adaptiveModeToCompanionMode(modeLabel);

    const sportsPrefs = sportsIntelligenceEngine.extractPreferences(
      input.memories,
      input.bundle.adaptive.sportsPreferences,
    );
    const { block: sportsBlock, highlight: _highlight } = await sportsIntelligenceEngine.buildSportsPromptBlock(
      input.userMessage,
      sportsPrefs,
      input.online ?? true,
    );

    const emotional = emotionalAwarenessEngine.analyze({
      profile: input.bundle.profile,
      moodHistory: input.moodHistory,
      baseline: input.bundle.adaptive.emotionalBaseline,
      userMessage: input.userMessage,
    });

    const graph = knowledgeGraphEngine.build({
      bundle: { ...input.bundle, adaptive: { ...input.bundle.adaptive, sportsPreferences: sportsPrefs } },
      memories: input.memories,
      goals: input.goals,
      routine: input.routine,
    });
    const graphPrompt = knowledgeGraphEngine.toPromptBlock(graph);

    const plan = this.buildPlan(modeLabel, companionMode, signals, input.bundle, {
      sportsBlock,
      emotionalCheckIn: emotional.checkInOffer,
    });

    return { signals, plan, graphPrompt };
  }

  toPromptExtension(plan: ResponsePlan, graphPrompt: string): string {
    const lines = [
      '## Adaptive signals (do not override the user-selected chat mode)',
      `Inferred energy: ${ADAPTIVE_MODE_LABELS[plan.modeLabel]} (${plan.tone})`,
      `Empathy: ${plan.empathyLevel}`,
      ...plan.guidance.filter((g) => !/humour/i.test(g)).map((g) => `- ${g}`),
    ];

    if (plan.memoryEmphasis) lines.push('- Weave in a relevant memory naturally if it fits.');
    if (plan.relationshipCallback) lines.push('- Acknowledge your shared history lightly.');
    if (plan.sportsBlock) lines.push('', plan.sportsBlock);
    if (plan.emotionalCheckIn) {
      lines.push('', '## Gentle check-in (use only if natural — do not repeat if user declined recently)');
      lines.push(plan.emotionalCheckIn);
    }
    if (graphPrompt) lines.push('', graphPrompt);

    return lines.join('\n');
  }

  private buildPlan(
    modeLabel: AdaptiveModeLabel,
    companionMode: import('../../types').CompanionModeId,
    signals: ConversationSignals,
    bundle: CompanionIntelligenceBundle,
    extras: { sportsBlock: string; emotionalCheckIn: string | null },
  ): ResponsePlan {
    const style = bundle.conversationStyle;
    const lengthHint: ResponsePlan['lengthHint'] =
      style.prefersShortAnswers > 0.65 ? 'brief' : style.prefersLongExplanations > 0.65 ? 'detailed' : 'balanced';

    const empathyLevel: ResponsePlan['empathyLevel'] = signals.needsSupport
      ? 'high'
      : signals.emotion === 'neutral'
        ? 'medium'
        : 'medium';

    const questionStyle: ResponsePlan['questionStyle'] =
      style.questioningStyle > 0.6 ? 'reflective' : style.questioningStyle < 0.35 ? 'minimal' : 'direct';

    const tone = this.modeTone(modeLabel, signals);
    const guidance = this.modeGuidance(modeLabel, signals, bundle);

    return {
      modeLabel,
      companionMode,
      tone,
      lengthHint,
      empathyLevel,
      questionStyle,
      memoryEmphasis: bundle.relationship.conversationCount > 5,
      relationshipCallback: bundle.relationship.milestones.length > 0 && signals.intent === 'celebrating',
      sportsBlock: extras.sportsBlock || undefined,
      emotionalCheckIn: extras.emotionalCheckIn ?? undefined,
      guidance,
    };
  }

  private modeTone(label: AdaptiveModeLabel, signals: ConversationSignals): string {
    switch (label) {
      case 'sports_friend':
        return 'enthusiastic sports buddy — facts vs opinions clearly separated';
      case 'calm_listener':
        return 'soft, unhurried, validating — no fixing unless asked';
      case 'motivator':
        return 'energising, belief-forward, one clear next step';
      case 'coach':
        return 'accountable, practical, action-oriented';
      case 'mentor':
        return 'wise, patient, big-picture perspective';
      case 'study_partner':
        return 'structured, encouraging, breaks concepts down';
      default:
        return signals.emotion === 'joy' || signals.intent === 'celebrating'
          ? 'warm, celebratory friend'
          : 'warm, natural friend';
    }
  }

  private modeGuidance(
    label: AdaptiveModeLabel,
    signals: ConversationSignals,
    bundle: CompanionIntelligenceBundle,
  ): string[] {
    const guidance: string[] = [];

    if (label === 'sports_friend') {
      guidance.push('Match their sports energy — celebrate wins, commiserate losses.');
    }
    if (label === 'study_partner') {
      guidance.push('Offer steps or analogies; check understanding with one question.');
    }
    if (label === 'calm_listener') {
      guidance.push('Reflect feelings first; avoid unsolicited advice.');
    }
    if (label === 'motivator') {
      guidance.push('Name their effort; suggest one small move forward.');
    }
    if (signals.intent === 'venting') {
      guidance.push('Listen fully before offering perspective.');
    }
    if (bundle.conversationStyle.emojiAffinity > 0.55) {
      guidance.push('Occasional emoji is fine — match their style.');
    }
    if (bundle.conversationStyle.pacingPreference > 0.6) {
      guidance.push('Take a thoughtful pace — do not rush.');
    }

    return guidance;
  }
}

export const adaptiveIntelligenceService = new AdaptiveIntelligenceService();
