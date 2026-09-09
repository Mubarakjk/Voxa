import { Memory } from '../../types';
import {
  ParsedTemporal,
  TemporalConfidence,
  TemporalPrecision,
  TemporalSource,
  formatTemporalLabel,
  parseTemporalExpressions,
  resolveDeviceTimeZone,
} from './temporal-parse';

export const TAG_TEMPORAL = 'temporal';
export const TAG_FUTURE = 'tfuture';
export const TAG_PAST = 'tpast';

const PRECISION_TAGS: Record<TemporalPrecision, string> = {
  time: 'tprec:time',
  day: 'tprec:day',
  range: 'tprec:range',
  vague: 'tprec:vague',
};

const SOURCE_TAGS: Record<TemporalSource, string> = {
  relative: 'tsrc:relative',
  stated: 'tsrc:stated',
};

const CONF_TAGS: Record<TemporalConfidence, string> = {
  high: 'tconf:high',
  medium: 'tconf:medium',
  low: 'tconf:low',
};

export type MemoryTemporalMeta = {
  occurredAt?: string;
  endsAt?: string;
  expiresAt?: string;
  precision: TemporalPrecision | null;
  source: TemporalSource | null;
  temporalConfidence: TemporalConfidence | null;
  isFutureEvent: boolean;
  isPastEvent: boolean;
  label: string | null;
};

export function tagsFromParsedTemporal(parsed: ParsedTemporal): string[] {
  const tags = [
    TAG_TEMPORAL,
    PRECISION_TAGS[parsed.precision],
    SOURCE_TAGS[parsed.source],
    CONF_TAGS[parsed.temporalConfidence],
  ];
  if (parsed.isFutureEvent) tags.push(TAG_FUTURE);
  if (parsed.isPastEvent) tags.push(TAG_PAST);
  if (parsed.endsAt) tags.push(`tend:${parsed.endsAt}`);
  return tags;
}

export function readTemporalMeta(memory: Memory, timeZone?: string): MemoryTemporalMeta {
  const precision = readTagPrefix(memory.tags, 'tprec:') as TemporalPrecision | null;
  const source = readTagPrefix(memory.tags, 'tsrc:') as TemporalSource | null;
  const temporalConfidence = readTagPrefix(memory.tags, 'tconf:') as TemporalConfidence | null;
  const endsAt = readRawTagPrefix(memory.tags, 'tend:') ?? undefined;
  const tz = resolveDeviceTimeZone(timeZone);
  let label: string | null = null;
  if (memory.occurredAt && precision) {
    label = formatTemporalLabel(
      {
        occurredAt: memory.occurredAt,
        endsAt,
        expiresAt: memory.expiresAt ?? memory.occurredAt,
        precision,
        source: source ?? 'relative',
        temporalConfidence: temporalConfidence ?? 'medium',
        isFutureEvent: memory.tags.includes(TAG_FUTURE),
        isPastEvent: memory.tags.includes(TAG_PAST),
        label: '',
        matchedPhrase: '',
      },
      tz,
    );
  }
  return {
    occurredAt: memory.occurredAt,
    endsAt,
    expiresAt: memory.expiresAt,
    precision,
    source,
    temporalConfidence,
    isFutureEvent: memory.tags.includes(TAG_FUTURE),
    isPastEvent: memory.tags.includes(TAG_PAST),
    label,
  };
}

export function parseUserTemporal(
  text: string,
  now: Date,
  timeZone?: string,
): ParsedTemporal | null {
  return parseTemporalExpressions(text, {
    now,
    timeZone: resolveDeviceTimeZone(timeZone),
  });
}

export function stripTemporalTags(tags: string[]): string[] {
  return tags.filter(
    (tag) =>
      tag !== TAG_TEMPORAL &&
      tag !== TAG_FUTURE &&
      tag !== TAG_PAST &&
      !tag.startsWith('tprec:') &&
      !tag.startsWith('tsrc:') &&
      !tag.startsWith('tconf:') &&
      !tag.startsWith('tend:'),
  );
}

export function mergeTemporalTags(existing: string[], parsed: ParsedTemporal | null): string[] {
  const base = stripTemporalTags(existing);
  if (!parsed) return base;
  return [...new Set([...base, ...tagsFromParsedTemporal(parsed)])];
}

function readTagPrefix(tags: string[], prefix: string): string | null {
  const raw = readRawTagPrefix(tags, prefix);
  return raw;
}

function readRawTagPrefix(tags: string[], prefix: string): string | null {
  const hit = tags.find((tag) => tag.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}
