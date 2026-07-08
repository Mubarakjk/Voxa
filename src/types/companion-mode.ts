/**
 * Core companion modes that shape how Voxa speaks, helps, and shows up.
 * Voxa is a life companion — not a single-purpose chatbot.
 */
export type CompanionModeId =
  | 'friend'
  | 'assistant'
  | 'teacher'
  | 'coach'
  | 'safe_call'
  | 'reflection';

export type CompanionCapability =
  | 'casual_conversation'
  | 'task_planning'
  | 'study_support'
  | 'fitness_motivation'
  | 'business_guidance'
  | 'emotional_support'
  | 'safety_check_in'
  | 'voice_call'
  | 'reminders'
  | 'memory_recall';

export type CompanionMode = {
  id: CompanionModeId;
  label: string;
  shortLabel: string;
  description: string;
  tone: string;
  openingMessage: string;
  helpsWith: string[];
  capabilities: CompanionCapability[];
  /** Modes that require explicit safety copy in UI */
  requiresSafetyDisclaimer: boolean;
};

export type CompanionModePreference = {
  defaultMode: CompanionModeId;
  lastUsedMode: CompanionModeId;
};
