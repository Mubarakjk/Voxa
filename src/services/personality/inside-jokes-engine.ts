import { InsideJoke } from '../../types/relationship-personality';
import { createId, nowIso } from '../../types';

const MAX_JOKES = 12;
const REFERENCE_COOLDOWN_MS = 1000 * 60 * 60 * 24 * 3;

export class InsideJokesEngine {
  detect(input: {
    jokes: InsideJoke[];
    userMessage: string;
    voxaReply: string;
  }): InsideJoke[] {
    const next = [...input.jokes];
    const lower = input.userMessage.toLowerCase();

    const nicknameMatch = input.userMessage.match(/call me ([a-zA-Z][a-zA-Z0-9_-]{1,20})/i);
    if (nicknameMatch) {
      this.addJoke(next, {
        label: nicknameMatch[1],
        context: 'User-approved nickname',
        kind: 'nickname',
        userApproved: true,
      });
    }

    if (/lol|haha|that'?s hilarious|made me laugh|inside joke/.test(lower)) {
      const snippet = input.userMessage.slice(0, 80).trim();
      this.addJoke(next, {
        label: snippet.slice(0, 40),
        context: snippet,
        kind: 'funny_moment',
        userApproved: true,
      });
    }

    const repeated = findRepeatedPhrase(input.userMessage, next);
    if (repeated) {
      this.addJoke(next, {
        label: repeated.slice(0, 40),
        context: repeated,
        kind: 'repeated_joke',
        userApproved: true,
      });
    }

    const catchphrase = detectCatchphrase(input.userMessage);
    if (catchphrase) {
      this.addJoke(next, {
        label: catchphrase,
        context: `Often says "${catchphrase}"`,
        kind: 'catchphrase',
        userApproved: true,
      });
    }

    if (/\b(meme|that meme|viral)\b/i.test(lower)) {
      const snippet = input.userMessage.slice(0, 60).trim();
      this.addJoke(next, {
        label: 'Shared meme',
        context: snippet,
        kind: 'meme',
        userApproved: true,
      });
    }

    if (input.userMessage.length > 80 && /remember when|that conversation/.test(lower)) {
      this.addJoke(next, {
        label: 'Memorable chat',
        context: input.userMessage.slice(0, 120),
        kind: 'memorable_chat',
        userApproved: true,
      });
    }

    return next.slice(0, MAX_JOKES);
  }

  /** Jokes safe to reference in prompt (not overused). */
  pickForPrompt(jokes: InsideJoke[]): InsideJoke[] {
    const now = Date.now();
    return jokes.filter((joke) => {
      if (!joke.userApproved) return false;
      if (joke.timesReferenced >= 3) return false;
      if (joke.lastReferencedAt) {
        const elapsed = now - new Date(joke.lastReferencedAt).getTime();
        if (elapsed < REFERENCE_COOLDOWN_MS) return false;
      }
      return true;
    }).slice(0, 2);
  }

  markReferenced(jokes: InsideJoke[], jokeId: string): InsideJoke[] {
    return jokes.map((joke) =>
      joke.id === jokeId
        ? {
            ...joke,
            timesReferenced: joke.timesReferenced + 1,
            lastReferencedAt: nowIso(),
          }
        : joke,
    );
  }

  private addJoke(
    list: InsideJoke[],
    partial: Pick<InsideJoke, 'label' | 'context' | 'kind' | 'userApproved'>,
  ) {
    if (list.some((j) => j.label.toLowerCase() === partial.label.toLowerCase())) return;
    list.unshift({
      id: createId('joke'),
      timesReferenced: 0,
      createdAt: nowIso(),
      ...partial,
    });
  }
}

function findRepeatedPhrase(message: string, existing: InsideJoke[]) {
  const phrase = message.trim().slice(0, 30);
  if (phrase.length < 8) return null;
  const count = existing.filter((j) => j.context.includes(phrase)).length;
  return count >= 1 ? phrase : null;
}

const CATCHPHRASES = ['lock in', 'let\'s go', 'no cap', 'bet', 'on it', 'say less'];

function detectCatchphrase(message: string): string | null {
  const lower = message.toLowerCase();
  for (const phrase of CATCHPHRASES) {
    if (lower.includes(phrase)) return phrase;
  }
  const quoted = message.match(/"([^"]{3,24})"/);
  if (quoted?.[1] && message.length < 120) return quoted[1];
  return null;
}

export const insideJokesEngine = new InsideJokesEngine();
