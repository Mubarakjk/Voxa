import { createUuid } from '../../types';
import {
  ImpostorPhase,
  ImpostorPlayer,
  ImpostorSession,
} from '../../types/social-games';

const WORD_BANK: Array<{ category: string; words: string[] }> = [
  { category: 'Food', words: ['Pizza', 'Sushi', 'Tacos', 'Pancakes', 'Mango', 'Popcorn', 'Waffles', 'Burrito'] },
  { category: 'Places', words: ['Beach', 'Library', 'Cinema', 'Museum', 'Park', 'Café', 'Zoo', 'Stadium'] },
  { category: 'Animals', words: ['Panda', 'Dolphin', 'Owl', 'Fox', 'Penguin', 'Koala', 'Otter', 'Flamingo'] },
  { category: 'Hobbies', words: ['Painting', 'Hiking', 'Cooking', 'Gaming', 'Dancing', 'Reading', 'Gardening', 'Yoga'] },
  { category: 'Objects', words: ['Umbrella', 'Telescope', 'Backpack', 'Candle', 'Headphones', 'Camera', 'Bicycle', 'Notebook'] },
];

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function listImpostorCategories(): string[] {
  return WORD_BANK.map((b) => b.category);
}

export function createImpostorSetup(playerNames: string[], category?: string): ImpostorSession {
  const names = playerNames.map((n) => n.trim()).filter(Boolean);
  if (names.length < 3) {
    throw new Error('Need at least 3 players');
  }
  if (names.length > 10) {
    throw new Error('Maximum 10 players');
  }

  const bank =
    category && category !== 'Random'
      ? WORD_BANK.find((b) => b.category === category) ?? WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)]
      : WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
  const secretWord = bank.words[Math.floor(Math.random() * bank.words.length)];
  const impostorIndex = Math.floor(Math.random() * names.length);
  const players: ImpostorPlayer[] = names.map((name, i) => ({
    id: createUuid(),
    name,
    isImpostor: i === impostorIndex,
    revealed: false,
  }));

  return {
    phase: 'onboarding',
    players: shuffle(players),
    secretWord,
    category: bank.category,
    revealIndex: 0,
    discussionSeconds: Math.min(180, 60 + names.length * 15),
    discussionRemaining: Math.min(180, 60 + names.length * 15),
    votes: {},
    winner: null,
    round: 1,
  };
}

export function advanceImpostorPhase(session: ImpostorSession, next: ImpostorPhase): ImpostorSession {
  return { ...session, phase: next };
}

export function markImpostorRevealed(session: ImpostorSession): ImpostorSession {
  const players = session.players.map((p, i) =>
    i === session.revealIndex ? { ...p, revealed: true } : p,
  );
  const nextIndex = session.revealIndex + 1;
  if (nextIndex >= players.length) {
    return {
      ...session,
      players,
      revealIndex: nextIndex,
      phase: 'discussion',
      discussionRemaining: session.discussionSeconds,
    };
  }
  return { ...session, players, revealIndex: nextIndex, phase: 'reveal' };
}

export function tickImpostorDiscussion(session: ImpostorSession): ImpostorSession {
  if (session.phase !== 'discussion') return session;
  const remaining = Math.max(0, session.discussionRemaining - 1);
  if (remaining === 0) {
    return { ...session, discussionRemaining: 0, phase: 'voting', votes: {} };
  }
  return { ...session, discussionRemaining: remaining };
}

export function castImpostorVote(session: ImpostorSession, voterId: string, accusedId: string): ImpostorSession {
  return {
    ...session,
    votes: { ...session.votes, [voterId]: accusedId },
  };
}

export function resolveImpostorVotes(session: ImpostorSession): ImpostorSession {
  const tallies = new Map<string, number>();
  Object.values(session.votes).forEach((accusedId) => {
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

  const impostor = session.players.find((p) => p.isImpostor);
  if (tie || !topId || !impostor) {
    return { ...session, phase: 'result', winner: 'impostor' };
  }
  const winner = topId === impostor.id ? 'crew' : 'impostor';
  return { ...session, phase: 'result', winner };
}

export function rematchImpostor(session: ImpostorSession): ImpostorSession {
  const names = session.players.map((p) => p.name);
  const next = createImpostorSetup(names, session.category);
  return { ...next, phase: 'reveal', round: session.round + 1 };
}

export function getImpostorRevealSecret(session: ImpostorSession): {
  player: ImpostorPlayer;
  headline: string;
  body: string;
} | null {
  const player = session.players[session.revealIndex];
  if (!player) return null;
  if (player.isImpostor) {
    return {
      player,
      headline: 'You are the Impostor',
      body: 'Blend in. Ask questions. Guess the secret word without giving yourself away.',
    };
  }
  return {
    player,
    headline: `Secret word: ${session.secretWord}`,
    body: `Category: ${session.category}. Help the group find the Impostor — without saying the word out loud.`,
  };
}
