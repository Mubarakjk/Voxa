import { CompanionIntelligenceBundle } from '../../types/companion-intelligence';
import { RelationshipStage } from '../../types/phase7-signature';
import { PersonalityGrowthSnapshot, RelationshipProgress, LIVING_STAGE_LABELS } from '../../types/phase11-living-companion';

const STAGE_TRAITS: Record<RelationshipStage, string[]> = {
  new_friend: ['Curious', 'Warm', 'Patient'],
  trusted_friend: ['Supportive', 'Reliable', 'Encouraging'],
  close_companion: ['Candid', 'Caring', 'Playful'],
  best_friend: ['Funny', 'Honest', 'Celebratory'],
  life_companion: ['Grounded', 'Loyal', 'Wise'],
};

const STAGE_UNLOCKS: Record<RelationshipStage, string[]> = {
  new_friend: ['Warm greetings', 'Gentle questions'],
  trusted_friend: ['Deeper check-ins', 'Goal callbacks'],
  close_companion: ['Inside jokes', 'Honest pushback'],
  best_friend: ['Playful banter', 'Special activities'],
  life_companion: ['Long-view wisdom', 'Celebration moments'],
};

export function buildPersonalityGrowth(input: {
  bundle: CompanionIntelligenceBundle;
  stage: RelationshipStage;
}): PersonalityGrowthSnapshot {
  const humour = input.bundle.personality.humourPreference ?? 0.5;
  const warmth = input.bundle.personality.preferredWordingWarmth ?? 0.5;
  const traits = STAGE_TRAITS[input.stage];
  const joke = input.bundle.insideJokes[0];

  let evolutionLine = 'I am learning how you like to talk.';
  if (input.stage === 'best_friend' || input.stage === 'life_companion') {
    evolutionLine = warmth >= 0.6 ? 'I feel more caring with you over time.' : 'I am more confident being direct with you now.';
  } else if (input.stage === 'close_companion') {
    evolutionLine = humour >= 0.5 ? 'I can be a bit more playful with you now.' : 'I am getting better at reading what you need.';
  } else if (input.stage === 'trusted_friend') {
    evolutionLine = 'I know your rhythms a little better each week.';
  }

  return {
    traits,
    evolutionLine,
    insideJokeLine: joke ? `"${joke.label}" still makes me smile.` : null,
    humourLevel: humour >= 0.65 ? 'high' : humour >= 0.4 ? 'medium' : 'low',
  };
}

export function getStageUnlocks(stage: RelationshipStage): string[] {
  return STAGE_UNLOCKS[stage];
}

export function relationshipProgress(input: {
  stage: RelationshipStage;
  conversationCount: number;
  sharedMemories: number;
  daysTogether: number;
}): RelationshipProgress {
  const stages: RelationshipStage[] = ['new_friend', 'trusted_friend', 'close_companion', 'best_friend', 'life_companion'];
  const idx = stages.indexOf(input.stage);
  const next = idx < stages.length - 1 ? stages[idx + 1] : null;
  const convTarget = [30, 60, 120, 200, 300][idx] ?? 100;
  const memTarget = [5, 10, 15, 25, 40][idx] ?? 10;
  const progress = Math.min(100, Math.round(
    (input.conversationCount / convTarget) * 50 +
    (input.sharedMemories / memTarget) * 50,
  ));

  return {
    stage: input.stage,
    stageLabel: LIVING_STAGE_LABELS[input.stage],
    nextStageLabel: next ? LIVING_STAGE_LABELS[next] : null,
    progressPercent: progress,
    conversationCount: input.conversationCount,
    sharedMemories: input.sharedMemories,
    unlocks: getStageUnlocks(input.stage),
  };
}
