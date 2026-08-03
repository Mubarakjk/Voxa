export type TodayQuickActionId =
  | 'brainstorm'
  | 'explain'
  | 'plan_day'
  | 'reflect'
  | 'decide'
  | 'motivate'
  | 'challenge'
  | 'journal';

export const TODAY_QUICK_ACTIONS: Array<{
  id: TodayQuickActionId;
  label: string;
  icon:
    | 'bulb-outline'
    | 'book-outline'
    | 'calendar-outline'
    | 'moon-outline'
    | 'git-branch-outline'
    | 'flame-outline'
    | 'flash-outline'
    | 'create-outline';
  starter: string;
}> = [
  {
    id: 'brainstorm',
    label: 'Brainstorm',
    icon: 'bulb-outline',
    starter: "Let's brainstorm. I'll share an idea and you help me expand it.",
  },
  {
    id: 'explain',
    label: 'Explain',
    icon: 'book-outline',
    starter: 'Explain something clearly for me. Ask what I want to understand.',
  },
  {
    id: 'plan_day',
    label: 'Plan my day',
    icon: 'calendar-outline',
    starter: 'Help me plan today. Ask what matters most, then suggest a realistic plan.',
  },
  {
    id: 'reflect',
    label: 'Reflect',
    icon: 'moon-outline',
    starter: "Let's reflect together. Ask one thoughtful question about my day.",
  },
  {
    id: 'decide',
    label: 'Help me decide',
    icon: 'git-branch-outline',
    starter: 'Help me decide. Ask for the options and what matters, then reason with me.',
  },
  {
    id: 'motivate',
    label: 'Motivate me',
    icon: 'flame-outline',
    starter: 'Give me a short motivational check-in. Be warm, specific, and not guilt-based.',
  },
  {
    id: 'challenge',
    label: 'Challenge me',
    icon: 'flash-outline',
    starter:
      'Challenge my thinking respectfully. Ask for my idea first, then stress-test it with clear reasoning — never argue for sport.',
  },
  {
    id: 'journal',
    label: 'Journal',
    icon: 'create-outline',
    starter: 'Start a short journal with me. Ask how I feel, then one prompt to write about.',
  },
];

export function getTodayQuickActionStarter(id: TodayQuickActionId): string | undefined {
  return TODAY_QUICK_ACTIONS.find((a) => a.id === id)?.starter;
}
