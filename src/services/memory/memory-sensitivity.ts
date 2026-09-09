export type MemorySensitivityKind =
  | 'none'
  | 'health'
  | 'sexual'
  | 'financial'
  | 'trauma'
  | 'conflict'
  | 'journal';

export const TAG_SENSITIVE = 'sensitive';

const PATTERNS: Array<{ kind: Exclude<MemorySensitivityKind, 'none'>; pattern: RegExp }> = [
  {
    kind: 'trauma',
    pattern:
      /\b(suicide|suicidal|self-?harm|abuse|abused|assault|raped?|trauma|ptsd|overdose|want to die|kill myself)\b/i,
  },
  {
    kind: 'sexual',
    pattern: /\b(sex|sexual|std|sti|porn|nude|naked|erection|orgasm)\b/i,
  },
  {
    kind: 'financial',
    pattern:
      /\b(salary|bank (account|login)|sort code|credit card|debit card|national insurance|ni number|password|pin number|account number)\b/i,
  },
  {
    kind: 'health',
    pattern:
      /\b(diagnos(?:is|ed)|cancer|chemotherapy|hiv|medication|prescription|depression|bipolar|schizophren|eating disorder)\b/i,
  },
  {
    kind: 'conflict',
    pattern: /\b(cheating on|affair with|divorce papers|restraining order|domestic violence)\b/i,
  },
  {
    kind: 'journal',
    pattern: /\b(in my journal|journal entry|dear diary)\b/i,
  },
];

export function detectMemorySensitivity(text: string): MemorySensitivityKind {
  for (const rule of PATTERNS) {
    if (rule.pattern.test(text)) return rule.kind;
  }
  return 'none';
}

export function isSensitiveText(text: string): boolean {
  return detectMemorySensitivity(text) !== 'none';
}

export function isSensitiveMemory(tags: string[], title = '', content = ''): boolean {
  if (tags.includes(TAG_SENSITIVE) || tags.includes('journal')) return true;
  return isSensitiveText(`${title} ${content}`);
}

export function shouldPersistSensitiveFact(text: string, explicitRemember: boolean): boolean {
  if (!isSensitiveText(text)) return true;
  return explicitRemember;
}
