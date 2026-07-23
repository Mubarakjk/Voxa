import { createUuid } from '../../types';
import {
  MafiaPhase,
  MafiaPlayer,
  MafiaRole,
  MafiaSession,
} from '../../types/social-games';

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function outsiderCount(n: number): number {
  if (n <= 5) return 1;
  if (n <= 8) return 2;
  return 3;
}

function assignRoles(count: number): MafiaRole[] {
  const roles: MafiaRole[] = [];
  const outsiders = outsiderCount(count);
  for (let i = 0; i < outsiders; i += 1) roles.push('outsider');
  if (count >= 5) roles.push('seer');
  if (count >= 7) roles.push('guardian');
  while (roles.length < count) roles.push('neighbour');
  return shuffle(roles);
}

export function roleLabel(role: MafiaRole): string {
  switch (role) {
    case 'outsider':
      return 'Outsider';
    case 'seer':
      return 'Seer';
    case 'guardian':
      return 'Guardian';
    default:
      return 'Neighbour';
  }
}

export function roleBlurb(role: MafiaRole): string {
  switch (role) {
    case 'outsider':
      return 'At night, quietly choose one neighbour to send home. By day, blend in.';
    case 'seer':
      return 'At night, peek at one person to learn if they are an Outsider.';
    case 'guardian':
      return 'At night, protect one person from being sent home.';
    default:
      return 'Listen carefully by day. Vote wisely. Keep the circle safe.';
  }
}

export function createMafiaSetup(playerNames: string[]): MafiaSession {
  const names = playerNames.map((n) => n.trim()).filter(Boolean);
  if (names.length < 5) throw new Error('Need at least 5 players');
  if (names.length > 12) throw new Error('Maximum 12 players');

  const roles = assignRoles(names.length);
  const players: MafiaPlayer[] = names.map((name, i) => ({
    id: createUuid(),
    name,
    role: roles[i],
    alive: true,
    revealed: false,
  }));

  return {
    phase: 'onboarding',
    players: shuffle(players),
    revealIndex: 0,
    night: 0,
    narration: [
      'Welcome to Night Circle — a calm mystery Voxa will narrate.',
      'Outsiders try to blend in. Neighbours try to keep the circle together.',
      'No scary themes — when someone leaves, they are simply “sent home.”',
    ],
    nightTargetId: null,
    seerPeekId: null,
    seerResult: null,
    guardianProtectId: null,
    discussionSeconds: Math.min(240, 90 + names.length * 12),
    discussionRemaining: Math.min(240, 90 + names.length * 12),
    votes: {},
    lastSentHomeId: null,
    lastSentHomeReason: null,
    winner: null,
    round: 1,
  };
}

export function alivePlayers(session: MafiaSession): MafiaPlayer[] {
  return session.players.filter((p) => p.alive);
}

export function aliveOutsiders(session: MafiaSession): MafiaPlayer[] {
  return alivePlayers(session).filter((p) => p.role === 'outsider');
}

export function markMafiaRevealed(session: MafiaSession): MafiaSession {
  const players = session.players.map((p, i) =>
    i === session.revealIndex ? { ...p, revealed: true } : p,
  );
  const nextIndex = session.revealIndex + 1;
  if (nextIndex >= players.length) {
    return startNight({ ...session, players, revealIndex: nextIndex });
  }
  return { ...session, players, revealIndex: nextIndex, phase: 'reveal' };
}

export function startNight(session: MafiaSession): MafiaSession {
  const night = session.night + 1;
  return {
    ...session,
    phase: 'night_intro',
    night,
    nightTargetId: null,
    seerPeekId: null,
    seerResult: null,
    guardianProtectId: null,
    narration: [
      `Night ${night} settles over the circle.`,
      'Pass the device only to the person whose turn it is. Others look away.',
      'When you are ready, continue.',
    ],
  };
}

export function advanceMafiaFromIntro(session: MafiaSession): MafiaSession {
  return { ...session, phase: 'night_outsider', narration: ['Outsiders — choose quietly who to send home tonight.'] };
}

export function setNightTarget(session: MafiaSession, targetId: string): MafiaSession {
  const hasSeer = alivePlayers(session).some((p) => p.role === 'seer');
  return {
    ...session,
    nightTargetId: targetId,
    phase: hasSeer ? 'night_seer' : nextAfterSeer(session),
    narration: hasSeer
      ? ['Seer — peek at one person. Learn if they are an Outsider.']
      : session.narration,
  };
}

function nextAfterSeer(session: MafiaSession): MafiaPhase {
  const hasGuardian = alivePlayers(session).some((p) => p.role === 'guardian');
  return hasGuardian ? 'night_guardian' : 'night_resolve';
}

export function setSeerPeek(session: MafiaSession, peekId: string): MafiaSession {
  const target = session.players.find((p) => p.id === peekId);
  const isOutsider = target?.role === 'outsider';
  const result = target
    ? isOutsider
      ? `${target.name} moves like an Outsider.`
      : `${target.name} feels like a Neighbour.`
    : 'Unclear.';
  const phase = nextAfterSeer(session);
  return {
    ...session,
    seerPeekId: peekId,
    seerResult: result,
    phase: phase === 'night_guardian' ? 'night_guardian' : 'night_resolve',
    narration:
      phase === 'night_guardian'
        ? ['Guardian — choose one person to protect tonight.']
        : ['The night resolves…'],
  };
}

export function setGuardianProtect(session: MafiaSession, protectId: string): MafiaSession {
  return {
    ...session,
    guardianProtectId: protectId,
    phase: 'night_resolve',
    narration: ['The night resolves…'],
  };
}

export function resolveNight(session: MafiaSession): MafiaSession {
  let players = session.players.map((p) => ({ ...p }));
  let lastSentHomeId: string | null = null;
  let lastSentHomeReason: 'night' | 'vote' | null = null;
  const lines: string[] = [];

  if (session.nightTargetId && session.nightTargetId !== session.guardianProtectId) {
    players = players.map((p) => (p.id === session.nightTargetId ? { ...p, alive: false } : p));
    lastSentHomeId = session.nightTargetId;
    lastSentHomeReason = 'night';
    const name = players.find((p) => p.id === lastSentHomeId)?.name ?? 'Someone';
    lines.push(`Morning light. ${name} was gently sent home in the night.`);
  } else if (session.nightTargetId && session.nightTargetId === session.guardianProtectId) {
    lines.push('Morning light. Someone was protected — nobody was sent home tonight.');
  } else {
    lines.push('Morning light. The circle is unchanged.');
  }

  const next: MafiaSession = {
    ...session,
    players,
    lastSentHomeId,
    lastSentHomeReason,
    phase: 'day_announce',
    narration: lines,
    votes: {},
  };
  const win = checkWin(next);
  if (win) {
    return {
      ...next,
      phase: 'win',
      winner: win,
      narration: [...lines, win === 'neighbours' ? 'Neighbours kept the circle.' : 'Outsiders outnumber the circle.'],
    };
  }
  return {
    ...next,
    phase: 'day_discuss',
    discussionRemaining: session.discussionSeconds,
    narration: [...lines, 'Talk it through. When the timer ends, you will vote who to send home.'],
  };
}

export function tickMafiaDiscussion(session: MafiaSession): MafiaSession {
  if (session.phase !== 'day_discuss') return session;
  const remaining = Math.max(0, session.discussionRemaining - 1);
  if (remaining === 0) {
    return { ...session, discussionRemaining: 0, phase: 'day_vote', votes: {} };
  }
  return { ...session, discussionRemaining: remaining };
}

export function castMafiaVote(session: MafiaSession, voterId: string, accusedId: string): MafiaSession {
  return { ...session, votes: { ...session.votes, [voterId]: accusedId } };
}

export function resolveMafiaVotes(session: MafiaSession): MafiaSession {
  const alive = alivePlayers(session);
  const tallies = new Map<string, number>();
  Object.entries(session.votes).forEach(([voterId, accusedId]) => {
    if (!alive.some((p) => p.id === voterId)) return;
    tallies.set(accusedId, (tallies.get(accusedId) ?? 0) + 1);
  });

  let topId: string | null = null;
  let topCount = -1;
  let tie = false;
  tallies.forEach((count, id) => {
    if (count > topCount) {
      topCount = count;
      topId = id;
      tie = false;
    } else if (count === topCount) {
      tie = true;
    }
  });

  if (tie || !topId) {
    return {
      ...session,
      phase: 'day_result',
      lastSentHomeId: null,
      lastSentHomeReason: null,
      narration: ['The vote was tied. Nobody is sent home today.'],
    };
  }

  const players = session.players.map((p) => (p.id === topId ? { ...p, alive: false } : p));
  const name = players.find((p) => p.id === topId)?.name ?? 'Someone';
  const next: MafiaSession = {
    ...session,
    players,
    lastSentHomeId: topId,
    lastSentHomeReason: 'vote',
    phase: 'day_result',
    narration: [`The circle voted. ${name} is sent home.`],
  };
  const win = checkWin(next);
  if (win) {
    return {
      ...next,
      phase: 'win',
      winner: win,
      narration: [
        ...next.narration,
        win === 'neighbours' ? 'Neighbours kept the circle together.' : 'Outsiders now hold the majority.',
      ],
    };
  }
  return next;
}

function checkWin(session: MafiaSession): 'neighbours' | 'outsiders' | null {
  const alive = alivePlayers(session);
  const outs = alive.filter((p) => p.role === 'outsider').length;
  const good = alive.length - outs;
  if (outs === 0) return 'neighbours';
  if (outs >= good) return 'outsiders';
  return null;
}

export function continueAfterDayResult(session: MafiaSession): MafiaSession {
  if (session.phase === 'win') return session;
  return startNight(session);
}

export function rematchMafia(session: MafiaSession): MafiaSession {
  const names = session.players.map((p) => p.name);
  const next = createMafiaSetup(names);
  return { ...next, phase: 'reveal', round: session.round + 1 };
}

export function getMafiaRevealSecret(session: MafiaSession): {
  player: MafiaPlayer;
  headline: string;
  body: string;
} | null {
  const player = session.players[session.revealIndex];
  if (!player) return null;
  return {
    player,
    headline: `You are the ${roleLabel(player.role)}`,
    body: roleBlurb(player.role),
  };
}
