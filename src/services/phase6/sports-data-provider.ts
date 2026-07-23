import { createUuid, nowIso } from '../../types';
import { SportsFact, SportsFactLabel, SportsProviderStatus } from '../../types/phase6-premium';

export type SportsQuery = {
  sport?: string;
  team?: string;
  league?: string;
  queryType: 'team' | 'fixtures' | 'standings' | 'general';
};

export interface ISportsDataProvider {
  readonly name: string;
  isConfigured(): boolean;
  fetchFacts(query: SportsQuery): Promise<SportsFact[]>;
}

const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map<string, { facts: SportsFact[]; expiresAt: number }>();

export class TheSportsDBProvider implements ISportsDataProvider {
  readonly name = 'TheSportsDB';

  isConfigured(): boolean {
    return true;
  }

  async fetchFacts(query: SportsQuery): Promise<SportsFact[]> {
    const key = `${query.queryType}:${query.team ?? query.sport ?? 'general'}`;
    const hit = cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.facts;

    if (query.team && query.queryType === 'team') {
      const facts = await this.fetchTeam(query.team);
      cache.set(key, { facts, expiresAt: Date.now() + CACHE_TTL_MS });
      return facts;
    }

    return [];
  }

  private async fetchTeam(teamName: string): Promise<SportsFact[]> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(
        `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(teamName)}`,
        { signal: controller.signal },
      );
      clearTimeout(timeout);
      if (!response.ok) return [];
      const data = (await response.json()) as { teams?: Array<{ strTeam: string; strLeague?: string; strStadium?: string; intFormedYear?: string }> };
      const team = data.teams?.[0];
      if (!team) return [];
      return [
        {
          label: 'verified_fact',
          text: `${team.strTeam}${team.strLeague ? ` plays in ${team.strLeague}` : ''}${team.strStadium ? ` · ${team.strStadium}` : ''}.`,
          team: team.strTeam,
          fetchedAt: nowIso(),
        },
      ];
    } catch {
      return [];
    }
  }
}

export function getSportsProviderStatus(provider: ISportsDataProvider, lastError?: string): SportsProviderStatus {
  return {
    configured: provider.isConfigured(),
    providerName: provider.name,
    lastFetchAt: cache.size > 0 ? nowIso() : undefined,
    cacheHit: cache.size > 0,
    error: lastError,
  };
}

let provider: ISportsDataProvider | null = null;

export function getSportsDataProvider(): ISportsDataProvider {
  if (!provider) provider = new TheSportsDBProvider();
  return provider;
}

export async function fetchSportsFactsForMessage(
  message: string,
  teams: string[],
): Promise<{ facts: SportsFact[]; status: SportsProviderStatus }> {
  const p = getSportsDataProvider();
  if (!p.isConfigured()) {
    return {
      facts: [],
      status: { configured: false, providerName: p.name, cacheHit: false, error: 'Live sports data unavailable' },
    };
  }

  const lower = message.toLowerCase();
  const team = teams.find((t) => lower.includes(t.toLowerCase())) ?? teams[0];
  if (!team) {
    return { facts: [], status: getSportsProviderStatus(p) };
  }

  try {
    const facts = await p.fetchFacts({ queryType: 'team', team });
    return { facts, status: getSportsProviderStatus(p) };
  } catch (err) {
    return {
      facts: [],
      status: getSportsProviderStatus(p, err instanceof Error ? err.message : 'Fetch failed'),
    };
  }
}

export function formatSportsFactsForPrompt(facts: SportsFact[]): string {
  if (facts.length === 0) {
    return 'Live sports data is unavailable — do not invent scores or results. Label opinions as [OPINION] and predictions as [PREDICTION].';
  }
  return facts
    .map((f) => {
      const tag = f.label === 'verified_fact' ? '[FACT]' : f.label === 'opinion' ? '[OPINION]' : f.label === 'prediction' ? '[PREDICTION]' : '[REPORTED]';
      return `${tag} ${f.text}`;
    })
    .join('\n');
}
