export const DAILY_QUOTES = [
  'Small steps still move mountains.',
  'You do not have to be perfect to be worthy.',
  'Rest is part of progress.',
  'Your pace is valid.',
  'One honest conversation can change the whole day.',
  'You have survived every hard day so far.',
  'Clarity often arrives after you start.',
  'Be gentle with yourself today.',
  'Progress is rarely linear — and that is okay.',
  'You are allowed to take up space.',
  'Courage can look like showing up quietly.',
  'What you feel is information, not failure.',
  'The next right step is enough.',
  'You are building something meaningful.',
  'Even a calm day is a good day.',
];

export function getDailyQuote(dayKey: string): string {
  let hash = 0;
  for (let i = 0; i < dayKey.length; i += 1) hash = (hash + dayKey.charCodeAt(i) * (i + 1)) % 997;
  return DAILY_QUOTES[Math.abs(hash) % DAILY_QUOTES.length];
}

export const DAILY_CHALLENGES = [
  'Send one message to someone you care about.',
  'Take a 5-minute walk without your phone.',
  'Write down three things you are grateful for.',
  'Drink a full glass of water before noon.',
  'Do one thing you have been putting off for 10 minutes.',
  'Stretch for 2 minutes and breathe deeply.',
  'Compliment yourself out loud once today.',
  'Put your phone away during one meal.',
  'Review one goal and take the smallest next step.',
  'Tell Voxa one thing that went well today.',
];

export function getDailyChallenge(dayKey: string, userId: string): string {
  let hash = 0;
  const seed = `${dayKey}-${userId}`;
  for (let i = 0; i < seed.length; i += 1) hash = (hash + seed.charCodeAt(i) * (i + 1)) % 997;
  return DAILY_CHALLENGES[Math.abs(hash) % DAILY_CHALLENGES.length];
}

export function getSurpriseMessage(dayKey: string, name: string): string | null {
  const hash = dayKey.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  if (hash % 5 !== 0) return null;
  const surprises = [
    `${name}, I saved a little surprise for you today — ask me anything.`,
    `Psst — I noticed you've been consistent. That matters.`,
    `Today's a good day for a tiny win, ${name}.`,
  ];
  return surprises[hash % surprises.length];
}
