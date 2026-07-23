import { SeasonalEvent } from '../../types/phase10-play';

function inRange(month: number, day: number, start: [number, number], end: [number, number]): boolean {
  const d = month * 100 + day;
  const s = start[0] * 100 + start[1];
  const e = end[0] * 100 + end[1];
  if (s <= e) return d >= s && d <= e;
  return d >= s || d <= e;
}

export function resolveSeasonalEvent(now = new Date()): SeasonalEvent | null {
  const m = now.getMonth() + 1;
  const d = now.getDate();

  if (inRange(m, d, [12, 20], [12, 31])) {
    return {
      id: 'christmas',
      label: 'Christmas season',
      theme: 'warm_gold',
      greeting: 'Cozy season — want a festive conversation?',
      challengeHint: 'Do one kind thing for someone today.',
      active: true,
    };
  }
  if (inRange(m, d, [10, 25], [10, 31])) {
    return {
      id: 'halloween',
      label: 'Halloween',
      theme: 'amber_night',
      greeting: 'Spooky season — fun questions or a mystery game?',
      active: true,
    };
  }
  if (inRange(m, d, [1, 1], [1, 7])) {
    return {
      id: 'new_year',
      label: 'New Year',
      theme: 'fresh_start',
      greeting: 'Fresh start energy — what do you want this year to feel like?',
      challengeHint: 'Write one intention for the week.',
      active: true,
    };
  }
  if (inRange(m, d, [3, 10], [4, 10])) {
    return {
      id: 'ramadan',
      label: 'Ramadan',
      theme: 'calm_moon',
      greeting: 'Wishing you peace this season.',
      challengeHint: 'One reflective moment tonight.',
      active: true,
    };
  }
  if (inRange(m, d, [4, 10], [4, 14])) {
    return {
      id: 'eid',
      label: 'Eid',
      theme: 'celebration',
      greeting: 'Eid Mubarak — celebrate something small today.',
      active: true,
    };
  }

  return null;
}
