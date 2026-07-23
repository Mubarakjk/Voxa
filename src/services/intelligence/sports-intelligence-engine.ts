import { Memory, nowIso } from '../../types';
import { SportsPreferences } from '../../types/phase3-intelligence';
import { fetchSportsFactsForMessage, formatSportsFactsForPrompt } from '../phase6/sports-data-provider';

const SPORTS_DETECT =
  /\b(sport|football|soccer|basketball|nba|nfl|mlb|tennis|cricket|rugby|f1|formula\s*1|ufc|boxing|golf|hockey|premier league|champions league|la\s*liga|serie\s*a|bundesliga)\b/i;

const TEAM_PATTERNS = [
  /\b(i support|my team is|we're? (?:a )?)([\w\s]{2,30}?)(?:\s+fan|\s+supporter|\.|,|$)/i,
  /\b(go|come on)\s+([\w\s]{2,25})(?:!|\.|$)/i,
];

const ATHLETE_PATTERNS = [
  /\b(i love|big fan of|admire)\s+([\w\s.'-]{2,40})(?:\.|,|$)/i,
  /\b(messi|ronaldo|lebron|curry|hamilton|verstappen|salah|haaland|osimhen)\b/i,
];

export type SportsContextResult = {
  isSportsConversation: boolean;
  preferences: SportsPreferences;
  promptBlock: string;
  highlight: string | null;
};

export class SportsIntelligenceEngine {
  detectSportsConversation(text: string): boolean {
    return SPORTS_DETECT.test(text);
  }

  extractPreferences(memories: Memory[], existing: SportsPreferences): SportsPreferences {
    const teams = new Set(existing.teams);
    const athletes = new Set(existing.athletes);
    const sports = new Set(existing.sports);

    for (const memory of memories) {
      const text = `${memory.title} ${memory.content}`.toLowerCase();
      if (!SPORTS_DETECT.test(text) && memory.category !== 'favourites') continue;

      for (const pattern of TEAM_PATTERNS) {
        const match = text.match(pattern);
        if (match?.[2]) teams.add(capitalize(match[2].trim()));
      }

      for (const pattern of ATHLETE_PATTERNS) {
        const match = text.match(pattern);
        if (match?.[2]) athletes.add(capitalize(match[2].trim()));
        else if (match?.[0]) athletes.add(capitalize(match[0].trim()));
      }

      if (/\bfootball\b|\bsoccer\b/.test(text)) sports.add('Football');
      if (/\bbasketball\b|\bnba\b/.test(text)) sports.add('Basketball');
      if (/\bnfl\b|\bamerican football\b/.test(text)) sports.add('NFL');
      if (/\btennis\b/.test(text)) sports.add('Tennis');
      if (/\bcricket\b/.test(text)) sports.add('Cricket');
      if (/\brugby\b/.test(text)) sports.add('Rugby');
      if (/\bf1\b|\bformula\b/.test(text)) sports.add('Formula 1');
      if (/\bufc\b|\bmma\b|\bboxing\b/.test(text)) sports.add('Combat Sports');
      if (/\bgolf\b/.test(text)) sports.add('Golf');
    }

    return {
      teams: [...teams].slice(0, 8),
      athletes: [...athletes].slice(0, 8),
      sports: [...sports].slice(0, 6),
      updatedAt: nowIso(),
    };
  }

  async buildSportsPromptBlock(
    userMessage: string,
    preferences: SportsPreferences,
    online: boolean,
  ): Promise<{ block: string; highlight: string | null }> {
    if (!this.detectSportsConversation(userMessage) && !this.mentionsPreferences(userMessage, preferences)) {
      return { block: '', highlight: null };
    }

    const lines: string[] = [
      '## Sports intelligence',
      'Clearly distinguish verified facts from personal opinions.',
      'Label facts with [FACT] and opinions with [OPINION].',
      'If unsure about a score or result, say so — do not invent stats.',
    ];

    if (preferences.teams.length > 0) {
      lines.push(`User favourite teams: ${preferences.teams.join(', ')}`);
    }
    if (preferences.athletes.length > 0) {
      lines.push(`User favourite athletes: ${preferences.athletes.join(', ')}`);
    }
    if (preferences.sports.length > 0) {
      lines.push(`Sports they follow: ${preferences.sports.join(', ')}`);
    }

    let highlight: string | null = null;

    if (online && preferences.teams[0]) {
      const { facts } = await fetchSportsFactsForMessage(userMessage, preferences.teams);
      const formatted = formatSportsFactsForPrompt(facts);
      if (facts.length > 0) {
        lines.push(formatted);
        highlight = facts[0].text;
      } else {
        const snippet = await this.fetchTeamFacts(preferences.teams[0]);
        if (snippet) {
          lines.push(snippet);
          highlight = snippet.replace('[FACT] ', '');
        }
      }
    } else if (!online) {
      lines.push('Offline — rely on general knowledge and label uncertainty clearly.');
    }

    return { block: lines.join('\n'), highlight };
  }

  private mentionsPreferences(text: string, prefs: SportsPreferences): boolean {
    const lower = text.toLowerCase();
    return [...prefs.teams, ...prefs.athletes, ...prefs.sports].some(
      (item) => item.length > 2 && lower.includes(item.toLowerCase()),
    );
  }

  private async fetchTeamFacts(teamName: string): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const response = await fetch(
        `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(teamName)}`,
        { signal: controller.signal },
      );
      clearTimeout(timeout);
      if (!response.ok) return null;

      const data = (await response.json()) as {
        teams?: Array<{
          strTeam: string;
          strLeague?: string;
          intFormedYear?: string;
          strStadium?: string;
          strCountry?: string;
        }>;
      };

      const team = data.teams?.[0];
      if (!team) return null;

      const parts = [`${team.strTeam}`];
      if (team.strLeague) parts.push(team.strLeague);
      if (team.strCountry) parts.push(team.strCountry);
      if (team.intFormedYear) parts.push(`est. ${team.intFormedYear}`);
      if (team.strStadium) parts.push(team.strStadium);

      return `[FACT] ${parts.join(' · ')}`;
    } catch {
      return null;
    }
  }
}

function capitalize(value: string): string {
  return value
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export const sportsIntelligenceEngine = new SportsIntelligenceEngine();
