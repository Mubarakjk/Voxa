import { CompanionModeId } from '../../types';
import {
  AdaptiveModeLabel,
  ConversationSignals,
  DetectedEmotion,
  DetectedIntent,
  adaptiveModeToCompanionMode,
} from '../../types/phase3-intelligence';
import { CompanionIntelligenceBundle } from '../../types/companion-intelligence';

const SPORTS_KEYWORDS =
  /\b(sport|football|soccer|basketball|nba|nfl|mlb|tennis|cricket|rugby|f1|formula|match|game|score|goal|league|champion|playoff|world cup|premier league|la liga|ufc|boxing|athlete|team)\b/i;

const STUDY_KEYWORDS =
  /\b(study|exam|homework|assignment|lecture|revision|revise|learn|course|essay|thesis|quiz|test prep|university|college|school)\b/i;

const MOTIVATION_KEYWORDS =
  /\b(motivat|inspire|push me|you got this|can't do|give up|stuck|procrastinat|accountability|discipline)\b/i;

const VENTING_KEYWORDS =
  /\b(stressed|overwhelm|anxious|worried|can't cope|exhausted|burnout|frustrated|angry|upset|sad|depressed|lonely)\b/i;

const CELEBRATION_KEYWORDS =
  /\b(won|passed|achieved|celebrate|amazing|great news|so happy|excited|proud|nailed it|crushed it)\b/i;

const REFLECTION_KEYWORDS =
  /\b(feel|feeling|journal|reflect|process|heavy heart|need to talk|listen|vent|just need)\b/i;

export class ModeInferenceEngine {
  inferSignals(userMessage: string, bundle: CompanionIntelligenceBundle): ConversationSignals {
    const lower = userMessage.toLowerCase();
    const sportsRelated = SPORTS_KEYWORDS.test(lower) || bundle.adaptive.sportsPreferences.sports.length > 0 && this.mentionsSportsPref(lower, bundle);

    let intent: DetectedIntent = 'casual_chat';
    if (sportsRelated) intent = 'sports_discussion';
    else if (STUDY_KEYWORDS.test(lower)) intent = 'studying';
    else if (MOTIVATION_KEYWORDS.test(lower)) intent = 'motivation';
    else if (VENTING_KEYWORDS.test(lower)) intent = 'venting';
    else if (CELEBRATION_KEYWORDS.test(lower)) intent = 'celebrating';
    else if (REFLECTION_KEYWORDS.test(lower)) intent = 'reflection';
    else if (/\b(help|advice|what should|how do i|recommend)\b/.test(lower)) intent = 'seeking_advice';
    else if (/\b(plan|schedule|organize|tomorrow|this week)\b/.test(lower)) intent = 'planning';
    else if (/\b(fix|solve|problem|issue|debug|broken)\b/.test(lower)) intent = 'problem_solving';

    const emotion = this.inferEmotion(lower, bundle);
    const needsSupport = intent === 'venting' || intent === 'reflection' || ['anxious', 'sad', 'frustrated', 'stressed'].includes(emotion);
    const wantsMotivation = intent === 'motivation' || MOTIVATION_KEYWORDS.test(lower);

    const confidence = sportsRelated || intent !== 'casual_chat' ? 0.82 : 0.55;

    return { emotion, intent, confidence, sportsRelated, needsSupport, wantsMotivation };
  }

  inferModeLabel(signals: ConversationSignals, bundle: CompanionIntelligenceBundle): AdaptiveModeLabel {
    if (signals.sportsRelated) return 'sports_friend';
    if (signals.needsSupport && signals.intent === 'reflection') return 'calm_listener';
    if (signals.needsSupport) return 'calm_listener';
    if (signals.wantsMotivation) return 'motivator';
    if (signals.intent === 'studying') return 'study_partner';
    if (signals.intent === 'seeking_advice' && bundle.profile.studyProgress.length > 0) return 'mentor';
    if (signals.intent === 'celebrating') return 'friend';
    if (signals.intent === 'planning' || signals.intent === 'problem_solving') return 'coach';
    if (signals.intent === 'motivation') return 'coach';

    const recent = bundle.adaptive.lastModeLabel;
    if (recent && signals.confidence < 0.6) return recent;
    return 'friend';
  }

  resolveCompanionMode(label: AdaptiveModeLabel): CompanionModeId {
    return adaptiveModeToCompanionMode(label);
  }

  private inferEmotion(lower: string, bundle: CompanionIntelligenceBundle): DetectedEmotion {
    if (/\b(excited|amazing|great|happy|pumped|stoked)\b/.test(lower)) return 'excitement';
    if (/\b(joy|wonderful|love this|best day)\b/.test(lower)) return 'joy';
    if (/\b(tired|exhausted|drained|sleepy)\b/.test(lower)) return 'tired';
    if (/\b(stress|overwhelm|anxious|worried|panic)\b/.test(lower)) return 'anxious';
    if (/\b(sad|down|depressed|lonely|miss)\b/.test(lower)) return 'sad';
    if (/\b(frustrat|annoyed|angry|mad|irritat)\b/.test(lower)) return 'frustrated';
    if (/\b(calm|peaceful|relaxed|okay|fine)\b/.test(lower)) return 'calm';

    const trend = bundle.profile.moodTrend[0]?.mood?.toLowerCase();
    if (trend?.includes('stress') || trend?.includes('low')) return 'stressed';
    if (trend?.includes('happy') || trend?.includes('motivat')) return 'joy';
    return 'neutral';
  }

  private mentionsSportsPref(lower: string, bundle: CompanionIntelligenceBundle): boolean {
    const prefs = bundle.adaptive.sportsPreferences;
    const all = [...prefs.teams, ...prefs.athletes, ...prefs.sports];
    return all.some((item) => item.length > 2 && lower.includes(item.toLowerCase()));
  }
}

export const modeInferenceEngine = new ModeInferenceEngine();
