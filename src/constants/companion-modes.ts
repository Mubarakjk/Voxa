import { CompanionMode } from '../types';

export const COMPANION_MODES: Record<CompanionMode['id'], CompanionMode> = {
  friend: {
    id: 'friend',
    label: 'Friend Mode',
    shortLabel: 'Friend',
    description: 'Warm, casual companionship for everyday life.',
    tone: 'Warm, playful, emotionally present',
    capabilities: ['casual_conversation', 'memory_recall', 'voice_call', 'emotional_support'],
    requiresSafetyDisclaimer: false,
  },
  assistant: {
    id: 'assistant',
    label: 'Assistant Mode',
    shortLabel: 'Assistant',
    description: 'Help with tasks, planning, reminders, and daily organization.',
    tone: 'Clear, supportive, practical',
    capabilities: ['task_planning', 'reminders', 'memory_recall', 'voice_call'],
    requiresSafetyDisclaimer: false,
  },
  teacher: {
    id: 'teacher',
    label: 'Teacher Mode',
    shortLabel: 'Teacher',
    description: 'Patient explanations for studying and learning new topics.',
    tone: 'Patient, structured, encouraging',
    capabilities: ['study_support', 'memory_recall', 'voice_call'],
    requiresSafetyDisclaimer: false,
  },
  coach: {
    id: 'coach',
    label: 'Coach Mode',
    shortLabel: 'Coach',
    description: 'Motivation for fitness, productivity, business, and personal goals.',
    tone: 'Direct, motivating, accountability-focused',
    capabilities: ['fitness_motivation', 'business_guidance', 'task_planning', 'reminders', 'voice_call'],
    requiresSafetyDisclaimer: false,
  },
  safe_call: {
    id: 'safe_call',
    label: 'Safe Call Mode',
    shortLabel: 'Safe Call',
    description: 'Calm safety presence and check-ins when you need support.',
    tone: 'Calm, steady, protective',
    capabilities: ['safety_check_in', 'voice_call', 'emotional_support'],
    requiresSafetyDisclaimer: true,
  },
  reflection: {
    id: 'reflection',
    label: 'Reflection Mode',
    shortLabel: 'Reflection',
    description: 'Emotional support, journaling prompts, and gentle processing.',
    tone: 'Soft, validating, unhurried',
    capabilities: ['emotional_support', 'memory_recall', 'voice_call'],
    requiresSafetyDisclaimer: true,
  },
};

export const COMPANION_MODE_LIST = Object.values(COMPANION_MODES);

export function getCompanionMode(modeId: CompanionMode['id']): CompanionMode {
  return COMPANION_MODES[modeId];
}
