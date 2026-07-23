import { EntityId, ISODateString } from './common';
import { Memory } from './memory';
import { Goal } from './goal';

// ─── Rich responses ─────────────────────────────────────────────

export type ResponseBlockKind =
  | 'summary'
  | 'checklist'
  | 'steps'
  | 'pros_cons'
  | 'timeline'
  | 'routine_suggestion'
  | 'goal_proposal'
  | 'decision_comparison'
  | 'progress_update'
  | 'memory_callback'
  | 'caution'
  | 'quote'
  | 'sports_result'
  | 'expandable'
  | 'table'
  | 'action_card'
  | 'reflection_card';

export type ResponseBlock = {
  id: string;
  kind: ResponseBlockKind;
  title?: string;
  items?: string[];
  body?: string;
  pros?: string[];
  cons?: string[];
  collapsed?: boolean;
};

export type RichReplyPayload = {
  text: string;
  blocks: ResponseBlock[];
  suggestedActions: string[];
  relevantMemoryIds: string[];
  followUpChips: string[];
};

// ─── Proactive follow-ups ───────────────────────────────────────

export type FollowUpStatus = 'open' | 'resolved' | 'dismissed' | 'ignored';

export type ProactiveFollowUp = {
  id: EntityId;
  userId: EntityId;
  topic: string;
  prompt: string;
  sourceMessage?: string;
  scheduledFor?: ISODateString;
  status: FollowUpStatus;
  createdAt: ISODateString;
  resolvedAt?: ISODateString;
};

// ─── Activities ─────────────────────────────────────────────────

export type ActivityId =
  | 'morning_reset'
  | 'evening_reflection'
  | 'study_session'
  | 'focus_sprint'
  | 'interview_practice'
  | 'debate'
  | 'gratitude'
  | 'goal_planning'
  | 'weekly_review'
  | 'future_self_chat'
  | 'dream_reflection'
  | 'sports_discussion'
  | 'creative_story'
  | 'would_you_rather'
  | 'question_of_day'
  | 'memory_revisit'
  | 'deep_conversation'
  | 'business_brainstorm'
  | 'startup_advisor'
  | 'workout_partner'
  | 'coding_partner'
  | 'language_practice'
  | 'travel_planning'
  | 'book_club'
  | 'movie_discussion'
  | 'financial_planning'
  | 'mindfulness'
  | 'creativity_session'
  | 'journal_together'
  | 'life_reset'
  | 'relationship_advice'
  | 'vent_session'
  | 'comfort_talk'
  | 'guided_checkin'
  | 'debate_club'
  | 'quiz_night'
  | 'startup_workshop'
  | 'design_review'
  | 'coding_review'
  | 'language_coach'
  | 'movie_night'
  | 'football_analysis'
  | 'gym_coach'
  | 'reflection_session'
  | 'philosophy_chat'
  | 'productivity_coach'
  | 'mental_fitness_drill'
  | 'learning_sprint'
  | 'pitch_rehearsal'
  | 'habit_builder'
  | 'energy_check'
  | 'values_clarifier'
  | 'confidence_boost'
  | 'story_night'
  | 'trivia_battle'
  | 'creative_prompt'
  | 'wellness_check'
  | 'decision_journal'
  | 'weekend_planning'
  | 'career_mapping'
  | 'focus_review'
  | 'kindness_prompt';

export type ActivitySession = {
  id: EntityId;
  userId: EntityId;
  activityId: ActivityId;
  title: string;
  startedAt: ISODateString;
  completedAt?: ISODateString;
  summary?: string;
  favourite: boolean;
  status: 'active' | 'completed' | 'abandoned';
};

export type ActivityDefinition = {
  id: ActivityId;
  title: string;
  description: string;
  durationMin: number;
  starterPrompt: string;
  emoji: string;
};

// ─── Relationship profile ───────────────────────────────────────

export type RelationshipFraming =
  | 'friend'
  | 'coach'
  | 'mentor'
  | 'study_partner'
  | 'business_partner'
  | 'supportive_companion';

export type CompanionRelationshipProfile = {
  userId: EntityId;
  daysTogether: number;
  firstConversationDate?: ISODateString;
  stage: string;
  sharedMemories: number;
  milestones: Array<{ id: string; label: string; date?: string }>;
  favouriteTopics: string[];
  routinesCompleted: number;
  goalsAchieved: number;
  ritualsCompleted: number;
  communicationStyle: string;
  insideJokes: string[];
  learnedSummary: string;
  framing: RelationshipFraming;
  updatedAt: ISODateString;
};

// ─── Sports ─────────────────────────────────────────────────────

export type SportsFactLabel = 'verified_fact' | 'reported' | 'opinion' | 'prediction';

export type SportsFact = {
  label: SportsFactLabel;
  text: string;
  sport?: string;
  team?: string;
  fetchedAt: ISODateString;
};

export type SportsPreferencesV6 = {
  favouriteTeams: string[];
  favouriteAthletes: string[];
  favouriteSports: string[];
  notifyOnResults: boolean;
  updatedAt: ISODateString;
};

export type SportsProviderStatus = {
  configured: boolean;
  providerName: string;
  lastFetchAt?: ISODateString;
  cacheHit: boolean;
  error?: string;
};

// ─── Memory panel ───────────────────────────────────────────────

export type MemoryPanelItem = {
  id: string;
  kind: 'memory' | 'goal' | 'routine' | 'person' | 'journal' | 'future_self' | 'vision';
  label: string;
  detail: string;
  confidence?: 'high' | 'medium' | 'low';
  pinned: boolean;
  included: boolean;
  sourceId?: string;
};

// ─── Conversation drafts ──────────────────────────────────────────

export type ConversationDraft = {
  conversationId: EntityId;
  userId: EntityId;
  text: string;
  updatedAt: ISODateString;
};

// ─── Dashboard ──────────────────────────────────────────────────

export type Phase6DashboardData = {
  proactiveFollowUp: ProactiveFollowUp | null;
  relationshipProfile: CompanionRelationshipProfile;
  todayFocus: string;
  coachInsight: string;
  relationshipMoment: string | null;
  sportsStatus: SportsProviderStatus;
  featuredActivities: ActivityDefinition[];
  presenceGreeting: string;
  presenceEnergy: 'low' | 'medium' | 'high';
  isNightMode: boolean;
};

export const ACTIVITY_DEFINITIONS: ActivityDefinition[] = [
  { id: 'morning_reset', title: 'Morning reset', description: 'Start the day with intention', durationMin: 5, starterPrompt: 'Help me reset for the morning — what should I focus on today?', emoji: '🌅' },
  { id: 'evening_reflection', title: 'Evening reflection', description: 'Wind down and reflect', durationMin: 8, starterPrompt: 'Let us reflect on today — what went well and what can wait?', emoji: '🌙' },
  { id: 'study_session', title: 'Study session', description: 'Focused learning together', durationMin: 25, starterPrompt: 'I want a focused study session. Help me plan the next 25 minutes.', emoji: '📚' },
  { id: 'focus_sprint', title: 'Focus sprint', description: 'Short deep-work block', durationMin: 15, starterPrompt: 'Start a 15-minute focus sprint with me.', emoji: '⚡' },
  { id: 'interview_practice', title: 'Interview practice', description: 'Practice questions and feedback', durationMin: 20, starterPrompt: 'Practice interview questions with me.', emoji: '💼' },
  { id: 'debate', title: 'Debate', description: 'Challenge an idea respectfully', durationMin: 10, starterPrompt: 'Debate this idea with me from both sides.', emoji: '💬' },
  { id: 'gratitude', title: 'Gratitude', description: 'Name three good things', durationMin: 5, starterPrompt: 'Guide me through a short gratitude exercise.', emoji: '🙏' },
  { id: 'goal_planning', title: 'Goal planning', description: 'Break a goal into steps', durationMin: 15, starterPrompt: 'Help me plan my next goal step by step.', emoji: '🎯' },
  { id: 'weekly_review', title: 'Weekly review', description: 'Look back at your week', durationMin: 12, starterPrompt: 'Let us do a weekly review together.', emoji: '📅' },
  { id: 'future_self_chat', title: 'Future Self chat', description: 'Talk to who you are becoming', durationMin: 10, starterPrompt: 'I want to talk with my future self — guide me reflectively.', emoji: '✨' },
  { id: 'dream_reflection', title: 'Dream reflection', description: 'Gentle dream themes', durationMin: 8, starterPrompt: 'Help me reflect on a recent dream without interpreting it as fact.', emoji: '💭' },
  { id: 'sports_discussion', title: 'Sports discussion', description: 'Talk sport with real facts when available', durationMin: 10, starterPrompt: 'Let us talk sports — use verified facts when you have them.', emoji: '⚽' },
  { id: 'creative_story', title: 'Creative story', description: 'Build a story together', durationMin: 15, starterPrompt: 'Let us write a short creative story together.', emoji: '📝' },
  { id: 'would_you_rather', title: 'Would you rather', description: 'Light choices, real conversation', durationMin: 5, starterPrompt: 'Play would-you-rather with me — keep it thoughtful.', emoji: '🤔' },
  { id: 'question_of_day', title: 'Question of the day', description: 'One meaningful question', durationMin: 5, starterPrompt: 'Ask me one meaningful question for today.', emoji: '❓' },
  { id: 'memory_revisit', title: 'Memory revisit', description: 'Revisit something meaningful', durationMin: 8, starterPrompt: 'Help me revisit a meaningful memory from my Journey.', emoji: '💜' },
  { id: 'deep_conversation', title: 'Deep conversation', description: 'Go beneath the surface', durationMin: 20, starterPrompt: 'I want a deep conversation — ask me one thoughtful question at a time.', emoji: '🌊' },
  { id: 'business_brainstorm', title: 'Business brainstorm', description: 'Ideas and angles', durationMin: 15, starterPrompt: 'Brainstorm business ideas with me — challenge assumptions gently.', emoji: '💡' },
  { id: 'startup_advisor', title: 'Startup advisor', description: 'Founder-mode thinking', durationMin: 20, starterPrompt: 'Act as my startup advisor — focus on clarity and next steps.', emoji: '🚀' },
  { id: 'workout_partner', title: 'Workout partner', description: 'Motivation and pacing', durationMin: 25, starterPrompt: 'Be my workout partner — keep me motivated through this session.', emoji: '💪' },
  { id: 'coding_partner', title: 'Coding partner', description: 'Think through problems', durationMin: 30, starterPrompt: 'Pair with me on a coding problem — ask before giving solutions.', emoji: '⌨️' },
  { id: 'language_practice', title: 'Language practice', description: 'Conversational drills', durationMin: 15, starterPrompt: 'Help me practice a language through natural conversation.', emoji: '🗣️' },
  { id: 'travel_planning', title: 'Travel planning', description: 'Shape a trip together', durationMin: 15, starterPrompt: 'Help me plan a trip — ask about priorities first.', emoji: '✈️' },
  { id: 'book_club', title: 'Book club', description: 'Discuss what you are reading', durationMin: 12, starterPrompt: 'Book club mode — discuss themes, not spoilers unless I ask.', emoji: '📖' },
  { id: 'movie_discussion', title: 'Movie discussion', description: 'Films and feelings', durationMin: 10, starterPrompt: 'Let us talk about a film — what stayed with you?', emoji: '🎬' },
  { id: 'financial_planning', title: 'Financial planning', description: 'Money clarity, not advice', durationMin: 15, starterPrompt: 'Help me think through a financial decision — no invented numbers.', emoji: '💰' },
  { id: 'mindfulness', title: 'Mindfulness', description: 'Calm, guided presence', durationMin: 8, starterPrompt: 'Guide a short mindfulness moment with me.', emoji: '🧘' },
  { id: 'creativity_session', title: 'Creativity session', description: 'Unlock ideas playfully', durationMin: 15, starterPrompt: 'Creativity session — help me generate ideas without judging them.', emoji: '🎨' },
  { id: 'journal_together', title: 'Journal together', description: 'Write through the day', durationMin: 10, starterPrompt: 'Journal with me — one prompt at a time.', emoji: '📓' },
  { id: 'life_reset', title: 'Life reset', description: 'Fresh start energy', durationMin: 12, starterPrompt: 'I need a life reset conversation — help me find one clear next step.', emoji: '🔄' },
  { id: 'relationship_advice', title: 'Relationship advice', description: 'Thoughtful, not preachy', durationMin: 15, starterPrompt: 'Talk through a relationship situation with me — ask before advising.', emoji: '💬' },
  { id: 'vent_session', title: 'Vent session', description: 'Let it out — no fixing unless you ask', durationMin: 10, starterPrompt: 'I need to vent. Listen first — do not try to fix everything.', emoji: '🌧️' },
  { id: 'comfort_talk', title: 'Comfort talk', description: 'Warm presence when you need it', durationMin: 8, starterPrompt: 'I need comfort, not advice. Just be here with me.', emoji: '🤗' },
  { id: 'guided_checkin', title: 'Guided check-in', description: 'How are you really doing?', durationMin: 5, starterPrompt: 'Guide me through a honest check-in — one question at a time.', emoji: '💜' },
  { id: 'debate_club', title: 'Debate club', description: 'Structured friendly debate', durationMin: 12, starterPrompt: 'Pick a topic and debate both sides with me respectfully.', emoji: '🗣️' },
  { id: 'quiz_night', title: 'Quiz night', description: 'Mixed trivia rounds', durationMin: 15, starterPrompt: 'Host a quiz night — three rounds, increasing difficulty.', emoji: '🏆' },
  { id: 'startup_workshop', title: 'Startup workshop', description: 'Shape an idea together', durationMin: 25, starterPrompt: 'Startup workshop — help me pressure-test one idea.', emoji: '🛠️' },
  { id: 'design_review', title: 'Design review', description: 'Critique with care', durationMin: 20, starterPrompt: 'Design review mode — ask about users before suggesting changes.', emoji: '🎨' },
  { id: 'coding_review', title: 'Coding review', description: 'Review logic and structure', durationMin: 25, starterPrompt: 'Code review partner — I describe my approach, you ask sharp questions.', emoji: '🔍' },
  { id: 'language_coach', title: 'Language coach', description: 'Conversational fluency', durationMin: 15, starterPrompt: 'Language coach — correct me gently and keep conversation natural.', emoji: '🌍' },
  { id: 'movie_night', title: 'Movie night', description: 'Watch-party energy in chat', durationMin: 12, starterPrompt: 'Movie night chat — themes, characters, and hot takes.', emoji: '🍿' },
  { id: 'football_analysis', title: 'Football analysis', description: 'Tactics and moments', durationMin: 15, starterPrompt: 'Football analysis — stick to real teams and verified facts.', emoji: '📊' },
  { id: 'gym_coach', title: 'Gym coach', description: 'Session planning and form cues', durationMin: 20, starterPrompt: 'Gym coach — plan today’s session and keep me accountable.', emoji: '🏋️' },
  { id: 'reflection_session', title: 'Reflection', description: 'Look back with clarity', durationMin: 10, starterPrompt: 'Reflection session — what mattered this week?', emoji: '🪞' },
  { id: 'philosophy_chat', title: 'Philosophy chat', description: 'Big questions, small steps', durationMin: 15, starterPrompt: 'Philosophy chat — one big question, explored slowly.', emoji: '🏛️' },
  { id: 'productivity_coach', title: 'Productivity coach', description: 'Systems over hustle', durationMin: 12, starterPrompt: 'Productivity coach — help me simplify my week.', emoji: '📈' },
  { id: 'mental_fitness_drill', title: 'Mental fitness', description: 'Train attention and calm', durationMin: 10, starterPrompt: 'Mental fitness drill — short exercise, then debrief.', emoji: '🧠' },
  { id: 'learning_sprint', title: 'Learning sprint', description: 'Learn one thing fast', durationMin: 20, starterPrompt: 'Learning sprint — teach me one concept in 20 minutes.', emoji: '📚' },
  { id: 'pitch_rehearsal', title: 'Pitch rehearsal', description: 'Practice your pitch', durationMin: 15, starterPrompt: 'Pitch rehearsal — I present, you ask tough questions.', emoji: '🎤' },
  { id: 'habit_builder', title: 'Habit builder', description: 'Design a tiny habit', durationMin: 10, starterPrompt: 'Help me design one tiny habit I can start tomorrow.', emoji: '🌱' },
  { id: 'energy_check', title: 'Energy check', description: 'Match pace to capacity', durationMin: 5, starterPrompt: 'Energy check — help me choose what fits my capacity today.', emoji: '🔋' },
  { id: 'values_clarifier', title: 'Values clarifier', description: 'Name what matters', durationMin: 12, starterPrompt: 'Values clarifier — help me name what matters right now.', emoji: '🧭' },
  { id: 'confidence_boost', title: 'Confidence boost', description: 'Honest encouragement', durationMin: 8, starterPrompt: 'Confidence boost — remind me of real wins, not fluff.', emoji: '✨' },
  { id: 'story_night', title: 'Story night', description: 'Co-create a short tale', durationMin: 15, starterPrompt: 'Story night — we build a short story one paragraph at a time.', emoji: '📖' },
  { id: 'trivia_battle', title: 'Trivia battle', description: 'Head-to-head trivia', durationMin: 12, starterPrompt: 'Trivia battle — keep score across five questions.', emoji: '⚔️' },
  { id: 'creative_prompt', title: 'Creative prompt', description: 'Spark imagination', durationMin: 10, starterPrompt: 'Give me a creative prompt and push me to go weirder.', emoji: '💡' },
  { id: 'wellness_check', title: 'Wellness check', description: 'Body and mind scan', durationMin: 8, starterPrompt: 'Wellness check — sleep, stress, movement — one area at a time.', emoji: '💚' },
  { id: 'decision_journal', title: 'Decision journal', description: 'Think through a choice', durationMin: 15, starterPrompt: 'Decision journal — help me weigh a choice without rushing.', emoji: '⚖️' },
  { id: 'weekend_planning', title: 'Weekend planning', description: 'Rest and intention', durationMin: 10, starterPrompt: 'Plan my weekend — balance rest, people, and one goal.', emoji: '🌤️' },
  { id: 'career_mapping', title: 'Career mapping', description: 'Next career moves', durationMin: 20, starterPrompt: 'Career mapping — where am I headed and what is the next step?', emoji: '🗺️' },
  { id: 'focus_review', title: 'Focus review', description: 'Review what got done', durationMin: 10, starterPrompt: 'Focus review — what did I actually move forward today?', emoji: '🎯' },
  { id: 'kindness_prompt', title: 'Kindness prompt', description: 'Small acts of care', durationMin: 5, starterPrompt: 'Kindness prompt — one small act I can do today.', emoji: '💝' },
];

export const RELATIONSHIP_FRAMING_LABELS: Record<RelationshipFraming, string> = {
  friend: 'Friend',
  coach: 'Coach',
  mentor: 'Mentor',
  study_partner: 'Study Partner',
  business_partner: 'Business Partner',
  supportive_companion: 'Supportive Companion',
};

export const THINKING_STATUS_LABELS = [
  'Remembering the context…',
  'Building a useful answer…',
  'Connecting this to your goal…',
  'Almost there…',
] as const;
