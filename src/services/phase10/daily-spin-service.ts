import { STORAGE_KEYS } from '../../constants/storage-keys';
import { EntityId } from '../../types';
import { DailySpinState, SpinReward } from '../../types/phase10-play';
import { IStorageService } from '../contracts';
import { getXpService } from './xp-service';

const REWARDS: Array<{ kind: SpinReward['kind']; label: string; xp?: number }> = [
  { kind: 'quote', label: 'Life quote' },
  { kind: 'starter', label: 'Conversation starter' },
  { kind: 'fact', label: 'Fun fact' },
  { kind: 'teaser', label: 'Brain teaser' },
  { kind: 'xp', label: 'XP boost', xp: 25 },
  { kind: 'challenge', label: 'Mini challenge' },
  { kind: 'badge', label: 'Cosmetic badge' },
];

const QUOTES = [
  'Small steps compound into extraordinary weeks.',
  'Consistency beats intensity when you are building a life.',
  'You do not need to feel ready to begin.',
];

const STARTERS = [
  'What is one thing you are proud of this week?',
  'If today had a soundtrack, what would it be?',
  'What would make tomorrow feel lighter?',
];

const FACTS = [
  'Your brain strengthens connections when you recall personal memories.',
  'Short breaks between focus blocks improve long-term retention.',
];

const TEASERS = [
  'I speak without a mouth and hear without ears. What am I?',
  'What has keys but no locks?',
];

function daySeed(date: string, userId: string): number {
  let h = 0;
  for (const c of `${date}:${userId}`) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

function buildReward(seed: number): SpinReward {
  const base = REWARDS[seed % REWARDS.length];
  let value = '';
  if (base.kind === 'quote') value = QUOTES[seed % QUOTES.length];
  if (base.kind === 'starter') value = STARTERS[seed % STARTERS.length];
  if (base.kind === 'fact') value = FACTS[seed % FACTS.length];
  if (base.kind === 'teaser') value = TEASERS[seed % TEASERS.length];
  if (base.kind === 'challenge') value = 'Send one kind message today.';
  if (base.kind === 'badge') value = 'Companion badge — Aurora';
  if (base.kind === 'xp') value = '+25 XP';
  return { ...base, value, xp: base.xp };
}

export function msUntilNextSpin(now = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return Math.max(0, next.getTime() - now.getTime());
}

export function formatSpinCountdown(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

export class DailySpinService {
  constructor(private readonly storage: IStorageService) {}

  private key(userId: EntityId, date: string) {
    return `${userId}:${date}`;
  }

  private today() {
    return new Date().toISOString().slice(0, 10);
  }

  async getState(userId: EntityId): Promise<DailySpinState> {
    const map = (await this.storage.getItem<Record<string, DailySpinState>>(STORAGE_KEYS.dailySpin)) ?? {};
    const today = this.today();
    return map[this.key(userId, today)] ?? { date: today, spun: false };
  }

  async spin(userId: EntityId): Promise<DailySpinState> {
    const today = this.today();
    const existing = await this.getState(userId);
    if (existing.spun && existing.reward) return existing;

    const seed = daySeed(today, userId);
    const reward = buildReward(seed);
    let xpGranted = false;
    let xpTransactionId: string | undefined;

    if (reward.xp && !existing.xpGranted) {
      const refId = `spin:${today}`;
      const award = await getXpService(this.storage).award(userId, reward.xp, 'spin', refId);
      xpGranted = true;
      xpTransactionId = award.transaction.id;
    }

    const next: DailySpinState = {
      date: today,
      spun: true,
      reward,
      xpGranted,
      xpTransactionId,
    };
    const map = (await this.storage.getItem<Record<string, DailySpinState>>(STORAGE_KEYS.dailySpin)) ?? {};
    map[this.key(userId, today)] = next;
    await this.storage.setItem(STORAGE_KEYS.dailySpin, map);
    return next;
  }
}

let instance: DailySpinService | null = null;

export function getDailySpinService(storage: IStorageService) {
  if (!instance) instance = new DailySpinService(storage);
  return instance;
}
