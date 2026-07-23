import { createUuid } from '../../types';
import {
  ConversationCard,
  PartyGameId,
  PartyGameSession,
  TruthOrChallengePrompt,
  TwoTruthsRound,
  WouldYouRatherCard,
} from '../../types/social-games';

export const WOULD_YOU_RATHER: WouldYouRatherCard[] = [
  { id: 'wyr1', optionA: 'Always know the weather a week ahead', optionB: 'Always find a perfect parking spot' },
  { id: 'wyr2', optionA: 'Speak every language fluently', optionB: 'Play every instrument beautifully' },
  { id: 'wyr3', optionA: 'Have endless curiosity', optionB: 'Have endless patience' },
  { id: 'wyr4', optionA: 'Relive your favourite day once a year', optionB: 'Preview one day of your future once a year' },
  { id: 'wyr5', optionA: 'Cook the perfect meal every time', optionB: 'Tell the perfect story every time' },
  { id: 'wyr6', optionA: 'Be known for kindness', optionB: 'Be known for creativity' },
  { id: 'wyr7', optionA: 'Travel with one suitcase forever', optionB: 'Stay put with a dream home forever' },
  { id: 'wyr8', optionA: 'Never need sleep', optionB: 'Never need to wait in line' },
  { id: 'wyr9', optionA: 'Always have the right playlist', optionB: 'Always have the right advice' },
  { id: 'wyr10', optionA: 'Explore space for a week', optionB: 'Explore the deep ocean for a week' },
  { id: 'wyr11', optionA: 'Be early to everything', optionB: 'Never forget a name' },
  { id: 'wyr12', optionA: 'Win a fun competition', optionB: 'Help a friend win theirs' },
];

export const TRUTH_PROMPTS: TruthOrChallengePrompt[] = [
  { id: 't1', kind: 'truth', text: 'What is a small habit that makes your day better?' },
  { id: 't2', kind: 'truth', text: 'What compliment do you quietly treasure?' },
  { id: 't3', kind: 'truth', text: 'Which song instantly lifts your mood?' },
  { id: 't4', kind: 'truth', text: 'What is something you are learning right now?' },
  { id: 't5', kind: 'truth', text: 'Who makes you feel most like yourself?' },
  { id: 't6', kind: 'truth', text: 'What place feels like a soft reset for you?' },
  { id: 't7', kind: 'truth', text: 'What is a dream you have not said out loud much?' },
  { id: 't8', kind: 'truth', text: 'What childhood snack still wins for you?' },
];

export const CHALLENGE_PROMPTS: TruthOrChallengePrompt[] = [
  { id: 'c1', kind: 'challenge', text: 'Give someone here a sincere one-sentence compliment.' },
  { id: 'c2', kind: 'challenge', text: 'Do a 10-second happy dance (or seated groove).' },
  { id: 'c3', kind: 'challenge', text: 'Invent a silly nickname for the person on your left.' },
  { id: 'c4', kind: 'challenge', text: 'Mime your favourite hobby until someone guesses.' },
  { id: 'c5', kind: 'challenge', text: 'Share a 15-second story about your day — ending on a high note.' },
  { id: 'c6', kind: 'challenge', text: 'Lead a group stretch for 20 seconds.' },
  { id: 'c7', kind: 'challenge', text: 'Draw a quick doodle of something that made you smile this week.' },
  { id: 'c8', kind: 'challenge', text: 'Speak only in questions for the next 30 seconds.' },
];

export const CONVERSATION_CARDS: ConversationCard[] = [
  { id: 'cc1', prompt: 'What is something ordinary that feels special when shared?', depth: 'light' },
  { id: 'cc2', prompt: 'If today had a soundtrack, what song would play?', depth: 'light' },
  { id: 'cc3', prompt: 'What recent moment made you laugh unexpectedly?', depth: 'light' },
  { id: 'cc4', prompt: 'What does a good friendship look like in practice for you?', depth: 'warm' },
  { id: 'cc5', prompt: 'When do you feel most listened to?', depth: 'warm' },
  { id: 'cc6', prompt: 'What is a value you want to protect as you grow?', depth: 'warm' },
  { id: 'cc7', prompt: 'What are you proud of that rarely gets mentioned?', depth: 'deep' },
  { id: 'cc8', prompt: 'If you could thank a past version of yourself, what for?', depth: 'deep' },
  { id: 'cc9', prompt: 'What kind of support helps you most when things feel heavy?', depth: 'deep' },
  { id: 'cc10', prompt: 'What is a hope you hold for the people in this room?', depth: 'warm' },
  { id: 'cc11', prompt: 'Describe a place that feels like peace to you.', depth: 'light' },
  { id: 'cc12', prompt: 'What boundary has made your life kinder?', depth: 'deep' },
];

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickUnused<T extends { id: string }>(pool: T[], used: string[]): T {
  const available = pool.filter((c) => !used.includes(c.id));
  const source = available.length > 0 ? available : pool;
  return source[Math.floor(Math.random() * source.length)];
}

export function createPartySession(gameId: PartyGameId, playerNames: string[]): PartyGameSession {
  const names = playerNames.map((n) => n.trim()).filter(Boolean);
  const fallback = names.length > 0 ? names : ['Player 1', 'Player 2'];
  const score: Record<string, number> = {};
  fallback.forEach((n) => {
    score[n] = 0;
  });

  return {
    gameId,
    phase: 'onboarding',
    playerNames: fallback,
    currentPlayerIndex: 0,
    cardIndex: 0,
    score,
    lastPick: null,
    pendingKind: null,
    currentPrompt: null,
    twoTruths: null,
    depthFilter: 'all',
    round: 1,
    usedCardIds: [],
  };
}

export function startPartyPlay(session: PartyGameSession): PartyGameSession {
  const next = { ...session, phase: 'play' as const };
  return dealNext(next);
}

export function currentPartyPlayer(session: PartyGameSession): string {
  return session.playerNames[session.currentPlayerIndex % session.playerNames.length] ?? 'Player';
}

export function dealNext(session: PartyGameSession): PartyGameSession {
  const used = [...session.usedCardIds];

  if (session.gameId === 'wouldYouRather') {
    const card = pickUnused(WOULD_YOU_RATHER, used);
    return {
      ...session,
      currentPrompt: JSON.stringify(card),
      lastPick: null,
      usedCardIds: [...used, card.id].slice(-40),
      cardIndex: session.cardIndex + 1,
    };
  }

  if (session.gameId === 'truthOrChallenge') {
    return {
      ...session,
      pendingKind: null,
      currentPrompt: null,
      cardIndex: session.cardIndex + 1,
    };
  }

  if (session.gameId === 'conversationCards') {
    const pool =
      session.depthFilter === 'all'
        ? CONVERSATION_CARDS
        : CONVERSATION_CARDS.filter((c) => c.depth === session.depthFilter);
    const card = pickUnused(pool.length ? pool : CONVERSATION_CARDS, used);
    return {
      ...session,
      currentPrompt: card.prompt,
      usedCardIds: [...used, card.id].slice(-40),
      cardIndex: session.cardIndex + 1,
    };
  }

  // two truths — reset entry form
  return {
    ...session,
    twoTruths: {
      speakerName: currentPartyPlayer(session),
      statement1: '',
      statement2: '',
      statement3: '',
      lieIndex: 0,
      guess: null,
      revealed: false,
    },
    cardIndex: session.cardIndex + 1,
  };
}

export function parseWyr(session: PartyGameSession): WouldYouRatherCard | null {
  if (!session.currentPrompt) return null;
  try {
    return JSON.parse(session.currentPrompt) as WouldYouRatherCard;
  } catch {
    return null;
  }
}

export function pickWouldYouRather(session: PartyGameSession, pick: 'A' | 'B'): PartyGameSession {
  const name = currentPartyPlayer(session);
  const score = { ...session.score, [name]: (session.score[name] ?? 0) + 1 };
  return { ...session, lastPick: pick, score };
}

export function advancePartyTurn(session: PartyGameSession): PartyGameSession {
  const nextIndex = (session.currentPlayerIndex + 1) % session.playerNames.length;
  return dealNext({
    ...session,
    currentPlayerIndex: nextIndex,
    lastPick: null,
    pendingKind: null,
    currentPrompt: null,
  });
}

export function chooseTruthOrChallenge(
  session: PartyGameSession,
  kind: 'truth' | 'challenge',
): PartyGameSession {
  const pool = kind === 'truth' ? TRUTH_PROMPTS : CHALLENGE_PROMPTS;
  const card = pickUnused(pool, session.usedCardIds);
  return {
    ...session,
    pendingKind: kind,
    currentPrompt: card.text,
    usedCardIds: [...session.usedCardIds, card.id].slice(-40),
  };
}

export function completeTruthOrChallenge(session: PartyGameSession): PartyGameSession {
  const name = currentPartyPlayer(session);
  const score = { ...session.score, [name]: (session.score[name] ?? 0) + 1 };
  return advancePartyTurn({ ...session, score });
}

export function updateTwoTruths(
  session: PartyGameSession,
  patch: Partial<TwoTruthsRound>,
): PartyGameSession {
  if (!session.twoTruths) return session;
  return { ...session, twoTruths: { ...session.twoTruths, ...patch } };
}

export function submitTwoTruthsStatements(session: PartyGameSession): PartyGameSession {
  const t = session.twoTruths;
  if (!t) return session;
  if (!t.statement1.trim() || !t.statement2.trim() || !t.statement3.trim()) {
    throw new Error('Fill in all three statements');
  }
  return session;
}

export function guessTwoTruthsLie(session: PartyGameSession, guess: 0 | 1 | 2): PartyGameSession {
  if (!session.twoTruths) return session;
  return { ...session, twoTruths: { ...session.twoTruths, guess, revealed: true } };
}

export function finishTwoTruthsRound(session: PartyGameSession): PartyGameSession {
  const t = session.twoTruths;
  if (!t || t.guess === null) return session;
  const correct = t.guess === t.lieIndex;
  const guesserIndex = (session.currentPlayerIndex + 1) % session.playerNames.length;
  const guesser = session.playerNames[guesserIndex] ?? currentPartyPlayer(session);
  const score = { ...session.score };
  if (correct) score[guesser] = (score[guesser] ?? 0) + 1;
  else score[t.speakerName] = (score[t.speakerName] ?? 0) + 1;
  return advancePartyTurn({ ...session, score, twoTruths: null });
}

export function setDepthFilter(
  session: PartyGameSession,
  depthFilter: PartyGameSession['depthFilter'],
): PartyGameSession {
  return dealNext({ ...session, depthFilter });
}

export function rematchParty(session: PartyGameSession): PartyGameSession {
  const next = createPartySession(session.gameId, session.playerNames);
  return { ...startPartyPlay(next), round: session.round + 1 };
}

export function partyInstructions(gameId: PartyGameId): string[] {
  switch (gameId) {
    case 'wouldYouRather':
      return [
        'Read both options aloud.',
        'Everyone picks a side and shares a short why.',
        'Tap Next when you are ready for a new dilemma.',
      ];
    case 'truthOrChallenge':
      return [
        'The current player chooses Truth or Challenge.',
        'Complete the prompt kindly — skip anything uncomfortable.',
        'Pass the turn when done.',
      ];
    case 'twoTruthsAndALie':
      return [
        'The speaker writes two truths and one lie.',
        'Others guess which statement is the lie.',
        'Reveal, score a point, then pass.',
      ];
    case 'conversationCards':
      return [
        'Draw a card and answer honestly.',
        'Listen without jumping to fix or judge.',
        'Pass when the moment feels complete.',
      ];
    default:
      return [];
  }
}

export function shuffleDeckPreview(gameId: PartyGameId): string {
  if (gameId === 'wouldYouRather') return `${WOULD_YOU_RATHER.length} dilemmas ready`;
  if (gameId === 'truthOrChallenge') {
    return `${TRUTH_PROMPTS.length} truths · ${CHALLENGE_PROMPTS.length} challenges`;
  }
  if (gameId === 'conversationCards') return `${CONVERSATION_CARDS.length} conversation cards`;
  return 'Bring your stories';
}

/** Exported for tests / debugging */
export function _shuffle<T>(items: T[]): T[] {
  return shuffle(items);
}

export function newSessionId(): string {
  return createUuid();
}
