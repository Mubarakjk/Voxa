import { CompanionModeId } from './companion-mode';
import { EntityId, ISODateString } from './common';
import { MemoryMood } from './memory';

/** Human-facing adaptive modes — mapped to CompanionModeId internally. */
export type AdaptiveModeLabel =
  | 'friend'
  | 'coach'
  | 'mentor'
  | 'study_partner'
  | 'sports_friend'
  | 'calm_listener'
  | 'motivator';

export type DetectedEmotion =
  | 'joy'
  | 'excitement'
  | 'calm'
  | 'neutral'
  | 'anxious'
  | 'sad'
  | 'frustrated'
  | 'stressed'
  | 'tired';

export type DetectedIntent =
  | 'venting'
  | 'seeking_advice'
  | 'celebrating'
  | 'studying'
  | 'planning'
  | 'sports_discussion'
  | 'motivation'
  | 'reflection'
  | 'casual_chat'
  | 'problem_solving';

export type ConversationSignals = {
  emotion: DetectedEmotion;
  intent: DetectedIntent;
  confidence: number;
  sportsRelated: boolean;
  needsSupport: boolean;
  wantsMotivation: boolean;
};

export type ResponsePlan = {
  modeLabel: AdaptiveModeLabel;
  companionMode: CompanionModeId;
  tone: string;
  lengthHint: 'brief' | 'balanced' | 'detailed';
  empathyLevel: 'low' | 'medium' | 'high';
  questionStyle: 'direct' | 'reflective' | 'minimal';
  memoryEmphasis: boolean;
  relationshipCallback: boolean;
  sportsBlock?: string;
  emotionalCheckIn?: string;
  guidance: string[];
};

export type SportsPreferences = {
  teams: string[];
  athletes: string[];
  sports: string[];
  updatedAt: ISODateString;
};

export type EmotionalBaseline = {
  averageMood: MemoryMood | 'neutral';
  recentTrend: 'improving' | 'steady' | 'declining';
  lastShiftDetectedAt?: ISODateString;
  checkInsOfferedAt: ISODateString[];
};

export type AdaptiveIntelligenceState = {
  lastModeLabel: AdaptiveModeLabel;
  lastSignals: ConversationSignals | null;
  sportsPreferences: SportsPreferences;
  emotionalBaseline: EmotionalBaseline;
  updatedAt: ISODateString;
};

export type KnowledgeGraphNode = {
  id: string;
  label: string;
  kind: 'interest' | 'goal' | 'memory' | 'routine' | 'person' | 'sport';
  weight: number;
};

export type KnowledgeGraphEdge = {
  from: string;
  to: string;
  relation: 'related_to' | 'supports' | 'mentions';
  weight: number;
};

export type KnowledgeGraph = {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  topInterests: string[];
  computedAt: ISODateString;
};

export type WeeklyGrowthSnapshot = {
  weekLabel: string;
  headline: string;
  achievements: string[];
  consistency: string;
  moodInsight: string | null;
  suggestedFocus: string;
  voxaReflection: string;
  stats: {
    conversations: number;
    routinesCompleted: number;
    memories: number;
    checkIns: number;
    journalEntries: number;
  };
};

export type Phase3DashboardData = {
  adaptiveModeLabel: AdaptiveModeLabel;
  adaptiveModeDisplay: string;
  weeklyGrowth: WeeklyGrowthSnapshot | null;
  emotionalInsight: string | null;
  sportsHighlight: string | null;
  knowledgeHighlights: string[];
};

export const ADAPTIVE_MODE_LABELS: Record<AdaptiveModeLabel, string> = {
  friend: 'Friend',
  coach: 'Coach',
  mentor: 'Mentor',
  study_partner: 'Study Partner',
  sports_friend: 'Sports Friend',
  calm_listener: 'Calm Listener',
  motivator: 'Motivator',
};

export function adaptiveModeToCompanionMode(label: AdaptiveModeLabel): CompanionModeId {
  switch (label) {
    case 'mentor':
    case 'study_partner':
      return 'teacher';
    case 'coach':
    case 'motivator':
      return 'coach';
    case 'calm_listener':
      return 'reflection';
    case 'sports_friend':
    case 'friend':
    default:
      return 'friend';
  }
}

export function createDefaultAdaptiveState(now: ISODateString): AdaptiveIntelligenceState {
  return {
    lastModeLabel: 'friend',
    lastSignals: null,
    sportsPreferences: { teams: [], athletes: [], sports: [], updatedAt: now },
    emotionalBaseline: {
      averageMood: 'neutral',
      recentTrend: 'steady',
      checkInsOfferedAt: [],
    },
    updatedAt: now,
  };
}
