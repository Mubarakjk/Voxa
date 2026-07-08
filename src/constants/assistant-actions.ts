import { AssistantAction } from '../types';

export const ASSISTANT_ACTIONS: AssistantAction[] = [
  {
    id: 'set_reminder',
    label: 'Set reminder',
    description: 'Schedule a reminder, alarm, or check-in with Voxa.',
    status: 'available',
    relatedModes: ['assistant', 'coach'],
  },
  {
    id: 'create_goal',
    label: 'Create goal',
    description: 'Track a new goal and optionally link check-ins.',
    status: 'available',
    relatedModes: ['coach', 'assistant'],
  },
  {
    id: 'start_safe_call',
    label: 'Start Safe Call',
    description: 'Begin a calm safety session with Voxa.',
    status: 'available',
    relatedModes: ['safe_call'],
  },
  {
    id: 'start_voice_call',
    label: 'Start voice call',
    description: 'Connect with Voxa over voice.',
    status: 'available',
    relatedModes: ['friend', 'assistant', 'teacher', 'coach', 'reflection'],
  },
  {
    id: 'switch_mode',
    label: 'Switch mode',
    description: 'Change how Voxa shows up — friend, coach, teacher, and more.',
    status: 'available',
  },
  {
    id: 'add_memory',
    label: 'Add memory',
    description: 'Save something important Voxa should remember.',
    status: 'available',
  },
  {
    id: 'summarize_day',
    label: 'Summarize day',
    description: 'Get a gentle recap of your day with Voxa.',
    status: 'coming_soon',
  },
];

export function getAssistantAction(id: AssistantAction['id']): AssistantAction | undefined {
  return ASSISTANT_ACTIONS.find((item) => item.id === id);
}
