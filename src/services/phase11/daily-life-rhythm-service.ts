import { DailyLifeRhythm } from '../../types/phase11-living-companion';

const QUOTES = [
  'Small steps compound.',
  'You do not need to feel ready to begin.',
  'Consistency beats intensity.',
];

export function buildDailyLifeRhythm(input: {
  firstName: string;
  todayFocus: string;
  routineNext: string | null;
  routineDone: number;
  routineTotal: number;
  hour?: number;
}): DailyLifeRhythm {
  const hour = input.hour ?? new Date().getHours();
  const seed = new Date().getDate();

  if (hour >= 5 && hour < 12) {
    return {
      period: 'morning',
      greeting: `Good morning, ${input.firstName}.`,
      focusLine: input.todayFocus,
      routineHint: input.routineNext ? `Next up: ${input.routineNext}` : null,
      weatherPlaceholder: '',
      quoteLine: QUOTES[seed % QUOTES.length],
      reflectionLine: null,
      progressLine: input.routineTotal > 0 ? `${input.routineDone}/${input.routineTotal} routine blocks today` : null,
      sleepReminder: null,
    };
  }

  if (hour >= 17 || hour < 5) {
    return {
      period: hour < 5 ? 'night' : 'evening',
      greeting: hour < 5 ? `Still up, ${input.firstName}?` : `Good evening, ${input.firstName}.`,
      focusLine: input.todayFocus,
      routineHint: null,
      weatherPlaceholder: '',
      quoteLine: null,
      reflectionLine: 'What felt good today — even something small?',
      progressLine: input.routineTotal > 0 ? `${input.routineDone}/${input.routineTotal} routines done` : null,
      sleepReminder: hour >= 21 ? 'Wind down when you can — tomorrow can wait.' : null,
    };
  }

  return {
    period: 'afternoon',
    greeting: `Good afternoon, ${input.firstName}.`,
    focusLine: input.todayFocus,
    routineHint: input.routineNext,
    weatherPlaceholder: '',
    quoteLine: null,
    reflectionLine: null,
    progressLine: null,
    sleepReminder: null,
  };
}
