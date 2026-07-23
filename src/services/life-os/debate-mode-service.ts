import { DebatePerspective } from '../../types/phase5-life-os';

export function runDebate(topic: string, perspective: DebatePerspective): {
  caseFor: string[];
  caseAgainst: string[];
  weakAssumptions: string[];
  missingEvidence: string[];
  betterQuestion: string;
  conclusion: string;
} {
  const base = {
    caseFor: [
      `There is a reasonable case for "${topic}" — it could unlock growth or solve a real problem.`,
      'You may have unique insight or timing that others underestimate.',
    ],
    caseAgainst: [
      'The idea may rely on assumptions that have not been tested.',
      'Competing priorities or costs might make this harder than it first appears.',
    ],
    weakAssumptions: ['That demand or motivation will stay high', 'That you have enough time and resources'],
    missingEvidence: ['Real feedback from someone who would use or benefit from this', 'A small test or pilot result'],
    betterQuestion: `What is the smallest version of "${topic}" you could try in the next two weeks?`,
    conclusion: 'Both sides have merit. Stress-test one assumption before committing fully.',
  };

  switch (perspective) {
    case 'devils_advocate':
      return {
        ...base,
        caseAgainst: [
          ...base.caseAgainst,
          'If this failed, what would you lose — and is that acceptable?',
        ],
        conclusion: 'Play devil\'s advocate: assume it fails. What would you do instead?',
      };
    case 'investor':
      return {
        ...base,
        caseFor: ['Clear problem-solution fit could attract support', 'Scalable if execution is disciplined'],
        caseAgainst: ['Market size and differentiation need proof', 'Unit economics may be unclear'],
        betterQuestion: 'What metric would convince a skeptical investor in 30 days?',
        conclusion: 'An investor would want evidence of traction, not just vision.',
      };
    case 'coach':
      return {
        ...base,
        caseFor: ['Aligned with growth if it matches your values', 'Could build confidence through action'],
        conclusion: 'A coach would ask: does this move you toward who you want to become?',
      };
    case 'customer':
      return {
        ...base,
        caseFor: ['If it solves a real pain, people will engage'],
        caseAgainst: ['Users care about outcomes, not features'],
        betterQuestion: 'Who specifically benefits, and what would they pay or change for it?',
        conclusion: 'Talk to one real person who fits the audience before building more.',
      };
    case 'defend':
      return {
        ...base,
        caseAgainst: ['Consider risks, but do not let fear block a good idea prematurely'],
        conclusion: 'Your idea has merit — strengthen it with one piece of evidence this week.',
      };
    case 'challenge':
    case 'balanced':
    default:
      return base;
  }
}
