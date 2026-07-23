import { CompanionIntelligenceBundle } from '../../types/companion-intelligence';
import { Goal, Memory, nowIso } from '../../types';
import { KnowledgeGraph, KnowledgeGraphEdge, KnowledgeGraphNode } from '../../types/phase3-intelligence';
import { TodayRoutineSummary } from '../../types/routine';
import { inferMemoryTheme } from '../memory/memory-theme-service';

export class KnowledgeGraphEngine {
  build(input: {
    bundle: CompanionIntelligenceBundle;
    memories: Memory[];
    goals: Goal[];
    routine?: TodayRoutineSummary | null;
    linkedLabels?: string[];
  }): KnowledgeGraph {
    const nodes: KnowledgeGraphNode[] = [];
    const edges: KnowledgeGraphEdge[] = [];
    const nodeIndex = new Map<string, KnowledgeGraphNode>();

    const addNode = (node: KnowledgeGraphNode) => {
      const existing = nodeIndex.get(node.id);
      if (existing) {
        existing.weight = Math.max(existing.weight, node.weight);
        return existing;
      }
      nodeIndex.set(node.id, node);
      nodes.push(node);
      return node;
    };

    const link = (from: string, to: string, relation: KnowledgeGraphEdge['relation'], weight: number) => {
      if (from === to) return;
      edges.push({ from, to, relation, weight });
    };

    for (const interest of input.bundle.profile.interests.slice(0, 12)) {
      const id = `interest:${slug(interest)}`;
      addNode({ id, label: interest, kind: 'interest', weight: 0.7 });
    }

    for (const goal of input.goals.filter((g) => g.status === 'active').slice(0, 10)) {
      const id = `goal:${goal.id}`;
      addNode({ id, label: goal.title, kind: 'goal', weight: 0.5 + goal.progress / 200 });
      const theme = goal.category === 'fitness' ? 'health' : goal.category === 'study' ? 'learning' : 'growth';
      link(id, `theme:${theme}`, 'supports', 0.6);
      addNode({ id: `theme:${theme}`, label: theme, kind: 'interest', weight: 0.55 });
    }

    for (const memory of input.memories.slice(0, 25)) {
      const id = `memory:${memory.id}`;
      const weight = (memory.importance + (memory.emotionalSignificance ?? memory.importance)) / 10;
      addNode({ id, label: memory.title, kind: 'memory', weight });

      const theme = inferMemoryTheme(memory);
      const themeId = `theme:${theme}`;
      addNode({ id: themeId, label: theme, kind: 'interest', weight: 0.5 });
      link(id, themeId, 'related_to', 0.7);

      if (memory.category === 'people') {
        const personId = `person:${slug(memory.title)}`;
        addNode({ id: personId, label: memory.title, kind: 'person', weight: 0.75 });
        link(id, personId, 'mentions', 0.8);
      }
    }

    const sports = input.bundle.adaptive.sportsPreferences;
    for (const team of sports.teams) {
      const id = `sport:${slug(team)}`;
      addNode({ id, label: team, kind: 'sport', weight: 0.8 });
    }
    for (const sport of sports.sports) {
      const id = `sport-type:${slug(sport)}`;
      addNode({ id, label: sport, kind: 'sport', weight: 0.65 });
    }

    if (input.routine?.blocks?.length) {
      for (const block of input.routine.blocks.slice(0, 6)) {
        const id = `routine:${slug(block.title)}`;
        addNode({ id, label: block.title, kind: 'routine', weight: block.completion ? 0.7 : 0.45 });
      }
    }

    for (const label of input.linkedLabels?.slice(0, 8) ?? []) {
      const id = `life-os:${slug(label)}`;
      addNode({ id, label, kind: 'interest', weight: 0.6 });
    }

    for (const person of input.bundle.profile.relationships.slice(0, 6)) {
      const id = `person:${slug(person.name)}`;
      addNode({ id, label: person.name, kind: 'person', weight: 0.7 });
    }

    const topInterests = [...nodes]
      .filter((n) => n.kind === 'interest' || n.kind === 'sport')
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 6)
      .map((n) => n.label);

    return { nodes, edges, topInterests, computedAt: nowIso() };
  }

  toPromptBlock(graph: KnowledgeGraph): string {
    if (graph.nodes.length === 0) return '';

    const highlights = graph.topInterests.length > 0
      ? `Connected interests: ${graph.topInterests.join(', ')}`
      : '';

    const strongMemories = graph.nodes
      .filter((n) => n.kind === 'memory')
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 4)
      .map((n) => n.label);

    const memoryLine =
      strongMemories.length > 0 ? `Meaningful memory threads: ${strongMemories.join('; ')}` : '';

    return ['## Knowledge graph (personalisation)', highlights, memoryLine]
      .filter(Boolean)
      .join('\n');
  }

  retrievalBoostTerms(graph: KnowledgeGraph, query: string): string[] {
    const tokens = tokenize(query);
    const boosted: string[] = [];

    for (const node of graph.nodes) {
      const nodeTokens = tokenize(node.label);
      let overlap = 0;
      for (const t of tokens) {
        if (nodeTokens.has(t)) overlap += 1;
      }
      if (overlap > 0) boosted.push(node.label);
    }

    return boosted.slice(0, 6);
  }
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
}

export const knowledgeGraphEngine = new KnowledgeGraphEngine();
