/** Local pass-and-play social games — no online multiplayer. */

export type SocialGameId =
  | 'impostor'
  | 'mafia'
  | 'wouldYouRather'
  | 'truthOrChallenge'
  | 'twoTruthsAndALie'
  | 'conversationCards';

export type PartyGameId = Exclude<SocialGameId, 'impostor' | 'mafia'>;

export type SocialGameDefinition = {
  id: SocialGameId;
  title: string;
  tagline: string;
  description: string;
  players: string;
  duration: string;
  accent: string;
};

export const SOCIAL_GAME_CATALOG: SocialGameDefinition[] = [
  {
    id: 'impostor',
    title: 'Impostor',
    tagline: 'Find who does not know the word',
    description: 'Pass-and-play. One player is the Impostor. Everyone else shares a secret word — hold to reveal, then discuss and vote.',
    players: '3–10',
    duration: '10–20 min',
    accent: '#A594F9',
  },
  {
    id: 'mafia',
    title: 'Night Circle',
    tagline: 'Voxa narrates a family-friendly mystery',
    description: 'A calm town story. Outsiders act at night; neighbours discuss by day. Pass the device — no violence, just who gets “sent home.”',
    players: '5–12',
    duration: '15–30 min',
    accent: '#6366F1',
  },
  {
    id: 'wouldYouRather',
    title: 'Would You Rather',
    tagline: 'Two choices, endless debate',
    description: 'Pick a side, share why, then flip to the next dilemma. Great icebreaker for any group size.',
    players: '2+',
    duration: '5–15 min',
    accent: '#34D399',
  },
  {
    id: 'truthOrChallenge',
    title: 'Truth or Challenge',
    tagline: 'Gentle truths & playful dares',
    description: 'Family-friendly prompts. Choose Truth or Challenge, complete it, then pass to the next player.',
    players: '2+',
    duration: '10–20 min',
    accent: '#F59E0B',
  },
  {
    id: 'twoTruthsAndALie',
    title: 'Two Truths & a Lie',
    tagline: 'Spot the fib',
    description: 'One player shares three statements. Everyone else guesses which is the lie — then reveal.',
    players: '3+',
    duration: '10–20 min',
    accent: '#F472B6',
  },
  {
    id: 'conversationCards',
    title: 'Conversation Cards',
    tagline: 'Warm prompts to go deeper',
    description: 'Draw a card, answer, listen, pass. Soft prompts for connection — not interrogation.',
    players: '2+',
    duration: '10–30 min',
    accent: '#2DD4BF',
  },
];

export function getSocialGameDefinition(id: SocialGameId): SocialGameDefinition {
  return SOCIAL_GAME_CATALOG.find((g) => g.id === id)!;
}

// ─── Shared session envelope ─────────────────────────────────────

export type GameSessionStatus = 'active' | 'paused' | 'finished';

export type PersistedGameSession<TPayload> = {
  id: string;
  userId: string;
  gameId: SocialGameId;
  status: GameSessionStatus;
  createdAt: string;
  updatedAt: string;
  payload: TPayload;
};

// ─── Impostor ────────────────────────────────────────────────────

export type ImpostorPhase =
  | 'setup'
  | 'onboarding'
  | 'reveal'
  | 'discussion'
  | 'voting'
  | 'result';

export type ImpostorPlayer = {
  id: string;
  name: string;
  isImpostor: boolean;
  revealed: boolean;
};

export type ImpostorSession = {
  phase: ImpostorPhase;
  players: ImpostorPlayer[];
  secretWord: string;
  category: string;
  revealIndex: number;
  discussionSeconds: number;
  discussionRemaining: number;
  votes: Record<string, string>; // voterId → accusedId
  winner: 'crew' | 'impostor' | null;
  round: number;
};

// ─── Mafia (Night Circle) ────────────────────────────────────────

export type MafiaRole = 'neighbour' | 'outsider' | 'seer' | 'guardian';

export type MafiaPhase =
  | 'setup'
  | 'onboarding'
  | 'reveal'
  | 'night_intro'
  | 'night_outsider'
  | 'night_seer'
  | 'night_guardian'
  | 'night_resolve'
  | 'day_announce'
  | 'day_discuss'
  | 'day_vote'
  | 'day_result'
  | 'win';

export type MafiaPlayer = {
  id: string;
  name: string;
  role: MafiaRole;
  alive: boolean;
  revealed: boolean;
};

export type MafiaSession = {
  phase: MafiaPhase;
  players: MafiaPlayer[];
  revealIndex: number;
  night: number;
  narration: string[];
  nightTargetId: string | null;
  seerPeekId: string | null;
  seerResult: string | null;
  guardianProtectId: string | null;
  discussionSeconds: number;
  discussionRemaining: number;
  votes: Record<string, string>;
  lastSentHomeId: string | null;
  lastSentHomeReason: 'night' | 'vote' | null;
  winner: 'neighbours' | 'outsiders' | null;
  round: number;
};

// ─── Party games ─────────────────────────────────────────────────

export type PartyPhase = 'onboarding' | 'play' | 'paused' | 'finished';

export type WouldYouRatherCard = {
  id: string;
  optionA: string;
  optionB: string;
};

export type TruthOrChallengePrompt = {
  id: string;
  kind: 'truth' | 'challenge';
  text: string;
};

export type ConversationCard = {
  id: string;
  prompt: string;
  depth: 'light' | 'warm' | 'deep';
};

export type TwoTruthsRound = {
  speakerName: string;
  statement1: string;
  statement2: string;
  statement3: string;
  lieIndex: 0 | 1 | 2;
  guess: 0 | 1 | 2 | null;
  revealed: boolean;
};

export type PartyGameSession = {
  gameId: PartyGameId;
  phase: PartyPhase;
  playerNames: string[];
  currentPlayerIndex: number;
  cardIndex: number;
  score: Record<string, number>;
  /** Would You Rather picks this round */
  lastPick: 'A' | 'B' | null;
  /** Truth or Challenge */
  pendingKind: 'truth' | 'challenge' | null;
  currentPrompt: string | null;
  /** Two Truths */
  twoTruths: TwoTruthsRound | null;
  /** Conversation cards depth filter */
  depthFilter: 'all' | 'light' | 'warm' | 'deep';
  round: number;
  usedCardIds: string[];
};
