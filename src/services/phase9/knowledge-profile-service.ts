import { UserPreferenceMemory } from '../../types/phase8-retention';
import { KnowledgeProfileEntry, PersonalKnowledgeProfile } from '../../types/phase9-intelligence';
import { nowIso } from '../../types';

export function buildKnowledgeProfile(prefs: UserPreferenceMemory[]): PersonalKnowledgeProfile {
  const entries: KnowledgeProfileEntry[] = prefs.map((p) => ({
    category: p.category,
    value: p.value,
    confidence: p.confidence,
  }));

  const learning = prefs.find((p) => p.category === 'learning');
  const career = prefs.find((p) => p.category === 'career');

  return {
    entries,
    learningStyle: learning?.value,
    workStyle: career?.value,
    motivationStyle: undefined,
    updatedAt: nowIso(),
  };
}

export function formatKnowledgeForPrompt(profile: PersonalKnowledgeProfile): string {
  if (profile.entries.length === 0) return '';
  const lines = profile.entries.slice(0, 10).map((e) => `${e.category}: ${e.value}`);
  return `Personal knowledge (only use when relevant — never invent):\n${lines.join('\n')}`;
}
