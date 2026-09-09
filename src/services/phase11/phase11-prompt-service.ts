export function buildPhase11PromptExtension(block: string): string {
  if (!block.trim()) return '';
  return `\n\n## Living companion (Phase 11)\n${block}`;
}

export function buildLivingConversationBlock(input: {
  recallLine?: string | null;
  followUpPrompt?: string | null;
  insideJoke?: string | null;
  stageBlock: string;
  personalityLine?: string | null;
  styleHints?: string[];
}): string {
  const lines = [
    input.stageBlock,
    input.recallLine ? `Memory recall (use naturally if relevant): ${input.recallLine}` : '',
    input.followUpPrompt ? `Follow-up to weave in: ${input.followUpPrompt}` : '',
    input.insideJoke ? `Inside joke (only if natural): ${input.insideJoke}` : '',
    input.personalityLine ?? '',
    'Conversation flow: prefer short reactions, callbacks, curiosity — not bullet walls unless asked.',
    'If user says they are tired or overwhelmed — respond emotionally first, do not plan or list tasks.',
    'If user shares a win (passed, got it, finally) — celebrate genuinely first, then continue.',
    'Avoid robotic openers. No "As an AI", "I understand", "How can I help".',
    ...(input.styleHints ?? []),
  ].filter(Boolean);

  return lines.join('\n');
}

export function buildPreConversationRecallQuestions(input: {
  recallLine: string | null;
  recentMemoryTitles: string[];
}): string {
  if (input.recallLine) {
    return `Before replying, silently consider: ${input.recallLine}`;
  }
  if (input.recentMemoryTitles.length) {
    return `Silently consider what changed since: ${input.recentMemoryTitles.slice(0, 3).join(', ')}.`;
  }
  return 'Silently consider what happened recently and what deserves a genuine follow-up.';
}

export function styleHintsFromPrefs(prefs?: {
  prefersShort?: boolean;
  prefersBullets?: boolean;
  prefersDeep?: boolean;
  prefersHumour?: boolean;
  prefersExamples?: boolean;
  prefersStepByStep?: boolean;
}): string[] {
  if (!prefs) return [];
  const hints: string[] = [];
  if (prefs.prefersShort) hints.push('Match their preferred reply length: keep it short.');
  if (prefs.prefersDeep) hints.push('They like detail — go deeper when it helps.');
  if (prefs.prefersBullets) hints.push('Use a short list only when they asked for structure.');
  if (prefs.prefersExamples) hints.push('Include a concrete example when explaining.');
  if (prefs.prefersStepByStep) hints.push('Break complex answers into clear steps.');
  return hints;
}
