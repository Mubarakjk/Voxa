import { RelationshipStage } from '../../types/phase7-signature';

export function resolveRelationshipStage(input: {
  daysTogether: number;
  conversationCount: number;
  sharedMemories: number;
  goalsCompleted: number;
}): RelationshipStage {
  if (input.daysTogether >= 365 && input.sharedMemories >= 30) return 'life_companion';
  if (input.daysTogether >= 180 && input.conversationCount >= 200) return 'best_friend';
  if (input.daysTogether >= 60 && input.sharedMemories >= 15) return 'close_companion';
  if (input.daysTogether >= 14 && input.conversationCount >= 30) return 'trusted_friend';
  return 'new_friend';
}

export function stageGreeting(stage: RelationshipStage, firstName: string): string {
  switch (stage) {
    case 'life_companion': return `${firstName} — we have built something real.`;
    case 'best_friend': return `Hey ${firstName}, you know I have got your back.`;
    case 'close_companion': return `Good to see you, ${firstName}.`;
    case 'trusted_friend': return `Hey ${firstName}, I am glad you are here.`;
    default: return `Hi ${firstName}.`;
  }
}

export function stagePromptBlock(stage: RelationshipStage): string {
  const lines: Record<RelationshipStage, string> = {
    new_friend: 'Tone: warm, curious, lightly formal. Build trust without oversharing.',
    trusted_friend: 'Tone: familiar, supportive. Reference shared history when natural.',
    close_companion: 'Tone: candid, encouraging. Gentle teasing okay if kind.',
    best_friend: 'Tone: playful, honest, celebratory. Inside jokes welcome.',
    life_companion: 'Tone: deep loyalty, calm confidence. Long-term perspective.',
  };
  return `## Relationship stage: ${stage}\n${lines[stage]}`;
}
