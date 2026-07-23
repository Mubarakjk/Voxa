import { createUuid } from '../../types/common';
import { DecisionOption } from '../../types/phase5-life-os';

export function simulateDecision(input: {
  question: string;
  values: string[];
  goals: string[];
}): {
  options: DecisionOption[];
  recommendedNextStep: string;
  caution?: string;
} {
  const isHighStakes = /job|university|move|relationship|money|medical|legal|invest/.test(input.question.toLowerCase());

  const options: DecisionOption[] = [
    {
      id: createUuid(),
      label: 'Yes — proceed',
      benefits: ['Moves you toward your goals', 'Creates momentum'],
      risks: ['May require more time or resources than expected'],
      shortTerm: ['Immediate change in daily routine'],
      longTerm: ['Could shape your direction for months'],
      unknowns: ['How you will feel after the change settles'],
      fitsValues: input.values[0] ? `Aligns with: ${input.values[0]}` : 'Consider your core values',
      reversible: !/move|quit|marry|buy house/.test(input.question.toLowerCase()),
      score: 55,
    },
    {
      id: createUuid(),
      label: 'No — hold off',
      benefits: ['Preserves current stability', 'More time to gather information'],
      risks: ['Opportunity may pass', 'Frustration if you stay stuck'],
      shortTerm: ['Status quo continues'],
      longTerm: ['May revisit this decision later'],
      unknowns: ['Whether waiting improves or worsens the outcome'],
      fitsValues: 'Protects what matters now',
      reversible: true,
      score: 45,
    },
    {
      id: createUuid(),
      label: 'Explore a middle path',
      benefits: ['Lower risk trial', 'More data before committing'],
      risks: ['May feel incomplete', 'Could delay a needed decision'],
      shortTerm: ['Small experiment or conversation'],
      longTerm: ['Informs a fuller decision later'],
      unknowns: ['Whether a partial step is possible'],
      fitsValues: input.goals[0] ? `Tests progress toward: ${input.goals[0]}` : 'Practical next step',
      reversible: true,
      score: 60,
    },
  ];

  return {
    options,
    recommendedNextStep: 'Write down what you would need to feel confident — then take one small step to learn more.',
    caution: isHighStakes
      ? 'This is a significant decision. Consider professional advice where appropriate. Voxa cannot guarantee outcomes.'
      : undefined,
  };
}
