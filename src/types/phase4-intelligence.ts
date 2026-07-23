import { CompanionModeId } from './companion-mode';
import { EntityId, ISODateString } from './common';
import { AdaptiveModeLabel } from './phase3-intelligence';
import { BucketListItem, FutureSelfNote, LifeBookEntry, LifeChallenge, VisionBoardItem } from './life-os';

/** Extended adaptive modes for Personality 3.0 */
export type PersonalityV3ModeLabel =
  | AdaptiveModeLabel
  | 'business_partner'
  | 'creative_partner';

export const PERSONALITY_V3_LABELS: Record<PersonalityV3ModeLabel, string> = {
  friend: 'Friend',
  coach: 'Coach',
  mentor: 'Mentor',
  study_partner: 'Study Partner',
  sports_friend: 'Sports Friend',
  calm_listener: 'Calm Listener',
  motivator: 'Motivator',
  business_partner: 'Business Partner',
  creative_partner: 'Creative Partner',
};

export function personalityV3ToCompanionMode(label: PersonalityV3ModeLabel): CompanionModeId {
  switch (label) {
    case 'business_partner':
    case 'coach':
    case 'motivator':
      return 'coach';
    case 'mentor':
    case 'study_partner':
      return 'teacher';
    case 'calm_listener':
      return 'reflection';
    case 'creative_partner':
    case 'sports_friend':
    case 'friend':
    default:
      return 'friend';
  }
}

export type LivingCompanionExpression = 'calm' | 'warm' | 'bright' | 'focused' | 'playful' | 'gentle' | 'proud';

export type LivingCompanionState = {
  greeting: string;
  subline: string;
  mood: LivingCompanionExpression;
  energy: 'low' | 'medium' | 'high';
  conversationStarter: string;
  thinkingAbout: string | null;
  daySignature: string;
};

export type ContextCardKind =
  | 'goal'
  | 'memory'
  | 'routine'
  | 'journal'
  | 'bucket_list'
  | 'vision_board'
  | 'future_self'
  | 'challenge'
  | 'conversation'
  | 'mood';

export type ContextCard = {
  id: string;
  kind: ContextCardKind;
  emoji: string;
  label: string;
  prompt: string;
  sourceId?: string;
  weight: number;
};

export type SmartChatActionId =
  | 'remember_this'
  | 'create_goal'
  | 'break_into_tasks'
  | 'create_challenge'
  | 'schedule_reminder'
  | 'save_to_journal'
  | 'add_to_bucket_list'
  | 'save_to_vision_board'
  | 'pin_memory'
  | 'explain_differently'
  | 'challenge_thinking'
  | 'continue_tomorrow'
  | 'open_canvas'
  | 'favourite_reply'
  | 'open_debate'
  | 'simulate_decision'
  | 'log_dream';

export type SmartChatAction = {
  id: SmartChatActionId;
  label: string;
  payload?: Record<string, string>;
};

export type MemoryConfidenceLevel = 'high' | 'medium' | 'low';

export type ConversationCanvasSection = {
  id: string;
  title: string;
  items: string[];
};

export type ConversationCanvas = {
  id: EntityId;
  conversationId: EntityId;
  topic: string;
  sections: ConversationCanvasSection[];
  progressPercent: number;
  updatedAt: ISODateString;
};

export type DelightMomentKind =
  | 'conversations_100'
  | 'conversations_1000'
  | 'anniversary'
  | 'goal_completed'
  | 'birthday'
  | 'milestone'
  | 'streak'
  | 'first_memory'
  | 'graduation'
  | 'new_job';

export type DelightMoment = {
  id: string;
  kind: DelightMomentKind;
  title: string;
  message: string;
  memoryCallback?: string;
  showConfetti: boolean;
  priority: number;
};

export type RelationshipGrowthSnapshot = {
  daysTogether: number;
  sharedMemories: number;
  milestones: Array<{ id: string; label: string }>;
  insideJokes: string[];
  evolutionLine: string | null;
  anniversaryLine: string | null;
  supportMoments: number;
};

export type LifeOSSnapshot = {
  bucketList: BucketListItem[];
  visionBoard: VisionBoardItem[];
  futureSelf: FutureSelfNote[];
  lifeBook: LifeBookEntry[];
  challenges: LifeChallenge[];
};

export type Phase4DashboardData = {
  livingCompanion: LivingCompanionState;
  contextCards: ContextCard[];
  relationshipGrowth: RelationshipGrowthSnapshot;
  lifeOS: LifeOSSnapshot;
  delightMoment: DelightMoment | null;
  personalityMode: PersonalityV3ModeLabel;
};

export type ChatExperiencePayload = {
  contextCards: ContextCard[];
  smartActions: SmartChatAction[];
  canvas: ConversationCanvas | null;
  livingCompanion: LivingCompanionState;
  delightMoment: DelightMoment | null;
  personalityMode: PersonalityV3ModeLabel;
};
