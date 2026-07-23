/**
 * Future-ready personality & relationship services (stubs).
 * Wire real providers when voice, avatar, analytics, and recap ship.
 */

import {
  AvatarPersonalityState,
  IPersonalityFutureServices,
  RelationshipAnalyticsSnapshot,
  VoicePersonalityEvolutionState,
  YearlyRecapPlaceholder,
} from '../../types/relationship-personality';
import { nowIso } from '../../types';
import { KnowledgeGraph } from '../../types/phase3-intelligence';

export type KnowledgeGraphProvider = {
  build(userId: string): Promise<KnowledgeGraph>;
};

export class FuturePersonalityArchitecture implements IPersonalityFutureServices {
  constructor(private readonly graphProvider?: KnowledgeGraphProvider) {}
  voiceEvolution = {
    async getState(_userId: string): Promise<VoicePersonalityEvolutionState> {
      return { warmth: 0.7, pace: 0.5, expressiveness: 0.55, lastUpdated: nowIso() };
    },
  };

  avatarPersonality = {
    async getState(_userId: string): Promise<AvatarPersonalityState> {
      return { expressiveness: 0.6, animationEnergy: 0.5 };
    },
  };

  relationshipAnalytics = {
    async snapshot(_userId: string): Promise<RelationshipAnalyticsSnapshot> {
      return {
        engagementScore: 0,
        consistencyScore: 0,
        trustScore: 0,
        computedAt: nowIso(),
      };
    },
  };

  lifeTimelineUi = {
    async listEvents(_userId: string) {
      return [];
    },
  };

  memoryVisualization = {
    graph: (userId: string) => this.buildKnowledgeGraph(userId),
  };

  private async buildKnowledgeGraph(userId: string): Promise<{ nodes: KnowledgeGraph['nodes']; edges: KnowledgeGraph['edges'] }> {
    if (!this.graphProvider) return { nodes: [], edges: [] };
    const full = await this.graphProvider.build(userId);
    return { nodes: full.nodes, edges: full.edges };
  }

  yearlyRecap = {
    async prepare(_userId: string, year: number): Promise<YearlyRecapPlaceholder> {
      return { year, ready: false };
    },
  };
}

export const futurePersonalityArchitecture = new FuturePersonalityArchitecture();
