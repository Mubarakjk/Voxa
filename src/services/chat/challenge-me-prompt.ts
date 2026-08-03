/**
 * Challenge Me — respectful critical thinking mode for Talk.
 * Never argue for sport; always explain reasoning.
 */
export function buildChallengeMePromptExtension(topicHint?: string): string {
  const lines = [
    '## Challenge Me mode',
    'The user wants respectful pushback, not agreement by default.',
    'Stress-test ideas with clear reasoning.',
    'Ask clarifying questions before strong conclusions.',
    'Offer the strongest counterpoints and a fair steelman of their view.',
    'Never argue for the sake of winning. Never belittle.',
    'Supported topics: business, coding, football, films, books, career, relationships, health, learning, finance, life decisions.',
    'Always explain *why* you disagree or probe — one clear reason minimum.',
    'If evidence is thin, say so and ask a better question instead of forcing a take.',
  ];
  if (topicHint?.trim()) {
    lines.push(`Starting topic hint: ${topicHint.trim().slice(0, 200)}`);
  }
  return lines.join('\n');
}

export const CHALLENGE_ME_STARTER =
  "Challenge my thinking. I'll share an idea — push back respectfully, explain your reasoning, and help me improve it.";
