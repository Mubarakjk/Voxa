export const USER_NAME = 'Mubarak';

export const chatMessages = [
  { id: '1', role: 'voxa' as const, text: 'Good evening, Mubarak. How are you feeling tonight?', time: '8:42 PM' },
  { id: '2', role: 'user' as const, text: "A bit tired, but grateful for how the day went.", time: '8:43 PM' },
  { id: '3', role: 'voxa' as const, text: "That's beautiful. Want to unwind together?", time: '8:43 PM' },
  { id: '4', role: 'user' as const, text: "Yes — tell me something calming.", time: '8:44 PM' },
  { id: '5', role: 'voxa' as const, text: 'Close your eyes. You handled today with grace.', time: '8:44 PM' },
];

export const safeContacts = [
  { id: '1', name: 'Amira', relation: 'Sister', status: 'Available' },
  { id: '2', name: 'James', relation: 'Friend', status: 'Available' },
  { id: '3', name: 'Dr. Patel', relation: 'Therapist', status: 'On call' },
];

export const homeInsights = [
  { id: '1', label: 'Mood today', value: 'Calm', detail: 'Steady since morning' },
  { id: '2', label: 'Last call', value: '12 min', detail: 'Voice · yesterday' },
  { id: '3', label: 'Memories', value: '24', detail: '3 new this week' },
];

export const settingSections = [
  {
    title: 'Companion',
    items: [
      { id: '1', label: 'Voice personality', value: 'Warm & calm' },
      { id: '2', label: 'Memory', value: 'On' },
      { id: '3', label: 'Check-ins', value: 'Gentle' },
    ],
  },
  {
    title: 'Privacy',
    items: [
      { id: '4', label: 'Safe word', value: 'Configured' },
      { id: '5', label: 'Data storage', value: 'Local only' },
    ],
  },
];
