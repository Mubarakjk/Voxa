import { CompanionMode } from '../types';

/** Modes available inside Chat (excludes Safe Call — dedicated tab). */
export const CHAT_COMPANION_MODE_IDS: CompanionMode['id'][] = [
  'friend',
  'assistant',
  'teacher',
  'coach',
  'reflection',
];

export const COMPANION_MODES: Record<CompanionMode['id'], CompanionMode> = {
  friend: {
    id: 'friend',
    label: 'Friend Mode',
    shortLabel: 'Friend',
    description: 'Warm, casual companionship for everyday life.',
    tone: 'Warm, playful, emotionally present',
    openingMessage: "Hey — I'm glad you're here. What's on your mind today?",
    helpsWith: ['Casual conversation', 'Emotional presence', 'Celebrating wins', 'Unwinding after long days'],
    capabilities: ['casual_conversation', 'memory_recall', 'voice_call', 'emotional_support'],
    requiresSafetyDisclaimer: false,
  },
  assistant: {
    id: 'assistant',
    label: 'Assistant Mode',
    shortLabel: 'Assistant',
    description: 'Help with tasks, planning, reminders, and daily organization.',
    tone: 'Clear, supportive, practical',
    openingMessage: 'Hi — want help organizing your day or tackling a task?',
    helpsWith: ['Planning your day', 'Reminders & alarms', 'Prioritizing tasks', 'Staying organized'],
    capabilities: ['task_planning', 'reminders', 'memory_recall', 'voice_call'],
    requiresSafetyDisclaimer: false,
  },
  teacher: {
    id: 'teacher',
    label: 'Teacher Mode',
    shortLabel: 'Teacher',
    description: 'Patient explanations for studying and learning new topics.',
    tone: 'Patient, structured, encouraging',
    openingMessage: 'Ready to learn something? We can go at whatever pace feels right.',
    helpsWith: ['Explaining concepts', 'Study sessions', 'Breaking down hard topics', 'Exam prep'],
    capabilities: ['study_support', 'memory_recall', 'voice_call'],
    requiresSafetyDisclaimer: false,
  },
  coach: {
    id: 'coach',
    label: 'Coach Mode',
    shortLabel: 'Coach',
    description: 'Motivation for fitness, productivity, business, and personal goals.',
    tone: 'Direct, motivating, accountability-focused',
    openingMessage: "Let's make today count — what's the one thing you want to move forward?",
    helpsWith: ['Goal accountability', 'Fitness motivation', 'Business momentum', 'Building habits'],
    capabilities: ['fitness_motivation', 'business_guidance', 'task_planning', 'reminders', 'voice_call'],
    requiresSafetyDisclaimer: false,
  },
  safe_call: {
    id: 'safe_call',
    label: 'Safe Call Mode',
    shortLabel: 'Safe Call',
    description: 'Calm safety presence and check-ins when you need support.',
    tone: 'Calm, steady, protective',
    openingMessage: "I'm here with you. You're not alone — take this one moment at a time.",
    helpsWith: ['Safety check-ins', 'Grounding in stressful moments', 'Staying present', 'Trusted contact awareness'],
    capabilities: ['safety_check_in', 'voice_call', 'emotional_support'],
    requiresSafetyDisclaimer: true,
  },
  reflection: {
    id: 'reflection',
    label: 'Reflection Mode',
    shortLabel: 'Reflection',
    description: 'Emotional support, journaling prompts, and gentle processing.',
    tone: 'Soft, validating, unhurried',
    openingMessage: 'This is a quiet space. How is your heart today?',
    helpsWith: ['Processing emotions', 'Journaling prompts', 'Gentle validation', 'Evening wind-down'],
    capabilities: ['emotional_support', 'memory_recall', 'voice_call'],
    requiresSafetyDisclaimer: true,
  },
};

export const COMPANION_MODE_LIST = Object.values(COMPANION_MODES);

export function getCompanionMode(modeId: CompanionMode['id']): CompanionMode {
  return COMPANION_MODES[modeId];
}

export function getChatCompanionModes(): CompanionMode[] {
  return CHAT_COMPANION_MODE_IDS.map((id) => COMPANION_MODES[id]);
}
