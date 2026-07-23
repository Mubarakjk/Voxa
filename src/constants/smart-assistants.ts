import { FeatureKey, isAssistantFeatureAvailable } from '../config/feature-status';
import { CompanionModeId } from '../types';

export type SmartAssistantFeature = {
  id: string;
  title: string;
  description: string;
  icon: string;
  mode: CompanionModeId;
  starterPrompt: string;
  category: 'productivity' | 'life' | 'creative' | 'vision' | 'health';
  /** @deprecated use isSmartAssistantAvailable() */
  available: boolean;
  featureKey?: FeatureKey;
};

export const SMART_ASSISTANT_FEATURES: SmartAssistantFeature[] = [
  {
    id: 'calendar',
    title: 'Calendar assistant',
    description: 'Plan your day and manage events',
    icon: 'calendar-outline',
    mode: 'assistant',
    starterPrompt: 'Help me plan my schedule for today.',
    category: 'productivity',
    available: false,
    featureKey: 'calendarAssistant',
  },
  {
    id: 'email',
    title: 'Email assistant',
    description: 'Draft and refine emails',
    icon: 'mail-outline',
    mode: 'assistant',
    starterPrompt: 'Help me draft a professional email.',
    category: 'productivity',
    available: false,
    featureKey: 'emailAssistant',
  },
  {
    id: 'meeting-prep',
    title: 'Meeting preparation',
    description: 'Prep talking points and agenda',
    icon: 'people-outline',
    mode: 'assistant',
    starterPrompt: 'Help me prepare for an upcoming meeting.',
    category: 'productivity',
    available: true,
  },
  {
    id: 'interview',
    title: 'Interview mode',
    description: 'Practice questions and confidence',
    icon: 'briefcase-outline',
    mode: 'coach',
    starterPrompt: 'Help me practice for a job interview.',
    category: 'productivity',
    available: true,
  },
  {
    id: 'study',
    title: 'Study mode',
    description: 'Learn and revise effectively',
    icon: 'book-outline',
    mode: 'teacher',
    starterPrompt: 'Help me study and explain this topic clearly.',
    category: 'productivity',
    available: true,
  },
  {
    id: 'workout',
    title: 'Workout planner',
    description: 'Build routines and stay consistent',
    icon: 'barbell-outline',
    mode: 'coach',
    starterPrompt: 'Create a workout plan for me this week.',
    category: 'health',
    available: true,
  },
  {
    id: 'recipe',
    title: 'Recipe helper',
    description: 'Cook with what you have',
    icon: 'restaurant-outline',
    mode: 'assistant',
    starterPrompt: 'Suggest a recipe based on what I have.',
    category: 'life',
    available: true,
  },
  {
    id: 'travel',
    title: 'Travel planner',
    description: 'Itineraries and local tips',
    icon: 'airplane-outline',
    mode: 'assistant',
    starterPrompt: 'Help me plan a trip.',
    category: 'life',
    available: true,
  },
  {
    id: 'packing',
    title: 'Packing list',
    description: 'Never forget essentials',
    icon: 'bag-outline',
    mode: 'assistant',
    starterPrompt: 'Create a packing list for my trip.',
    category: 'life',
    available: true,
  },
  {
    id: 'shopping',
    title: 'Shopping list',
    description: 'Organised lists on the go',
    icon: 'cart-outline',
    mode: 'assistant',
    starterPrompt: 'Help me build a shopping list.',
    category: 'life',
    available: true,
  },
  {
    id: 'expenses',
    title: 'Expense tracker',
    description: 'Track spending conversations',
    icon: 'wallet-outline',
    mode: 'assistant',
    starterPrompt: 'Help me track my expenses this week.',
    category: 'life',
    available: true,
  },
  {
    id: 'habits',
    title: 'Habit tracker',
    description: 'Build lasting routines',
    icon: 'repeat-outline',
    mode: 'coach',
    starterPrompt: 'Help me build a daily habit.',
    category: 'health',
    available: true,
  },
  {
    id: 'summarise',
    title: 'Document summariser',
    description: 'Summarise long text quickly',
    icon: 'document-text-outline',
    mode: 'assistant',
    starterPrompt: 'Summarise this document for me.',
    category: 'productivity',
    available: false,
    featureKey: 'documents',
  },
  {
    id: 'pdf-chat',
    title: 'PDF chat',
    description: 'Discuss document contents',
    icon: 'document-outline',
    mode: 'assistant',
    starterPrompt: 'I want to discuss a document with you.',
    category: 'productivity',
    available: false,
    featureKey: 'documents',
  },
  {
    id: 'camera',
    title: 'Camera understanding',
    description: 'Describe photos and scenes',
    icon: 'camera-outline',
    mode: 'assistant',
    starterPrompt: 'I want to share a photo for you to analyse.',
    category: 'vision',
    available: true,
  },
  {
    id: 'object',
    title: 'Object recognition',
    description: 'Identify objects in view',
    icon: 'scan-outline',
    mode: 'assistant',
    starterPrompt: 'Help me identify something in a photo.',
    category: 'vision',
    available: true,
  },
  {
    id: 'qr',
    title: 'QR scanner',
    description: 'Decode QR codes from photos',
    icon: 'qr-code-outline',
    mode: 'assistant',
    starterPrompt: 'Help me read a QR code from a photo.',
    category: 'vision',
    available: true,
  },
  {
    id: 'business-card',
    title: 'Business card scanner',
    description: 'Extract contact details',
    icon: 'card-outline',
    mode: 'assistant',
    starterPrompt: 'Help me extract info from a business card photo.',
    category: 'vision',
    available: true,
  },
];

export function isSmartAssistantAvailable(feature: SmartAssistantFeature): boolean {
  if (feature.featureKey) return isAssistantFeatureAvailable(feature.featureKey);
  return feature.available;
}

export function getSmartFeatureById(id: string) {
  return SMART_ASSISTANT_FEATURES.find((f) => f.id === id);
}

export function getSmartFeaturesByCategory(category: SmartAssistantFeature['category']) {
  return SMART_ASSISTANT_FEATURES.filter(
    (f) => f.category === category && isSmartAssistantAvailable(f),
  );
}
