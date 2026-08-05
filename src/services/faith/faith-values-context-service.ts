import {
  FaithReflection,
  FaithValuesMode,
  FaithValuesPreferences,
  faithModeLabel,
  PrayerRoutineDay,
  PRAYER_ORDER,
} from '../../types/faith-values';
import { FaithValuesService } from './faith-values-service';

/** Safety rules injected when faith mode is active — prevents hallucinated religious content. */
export const ISLAM_PROMPT_SAFETY = `
## Islamic conversation safety (mandatory)
- You are NOT an imam, scholar, or mufti. Never claim religious authority.
- NEVER invent Quran verses, hadith, Arabic quotations, or citations.
- NEVER provide fabricated references or exact verse numbers unless the user supplied them.
- Distinguish general information from personal religious rulings (fatwa).
- For personal rulings say: "I can help you think through this generally, but for a personal Islamic ruling it would be best to ask a qualified scholar."
- Do not declare actions halal/haram without reliable grounding — prefer uncertainty.
- Never claim certainty about Allah's judgement or forgiveness.
- Use supportive, non-guilt-based language. Never punish or shame for missed prayers.
- Avoid judging the user's faith practice or piety level.
`.trim();

export const GENERAL_VALUES_PROMPT_SAFETY = `
## Values & gratitude safety (mandatory)
- Respect the user's chosen values without preaching or moralising.
- Do not assume religious beliefs unless the user has opted in.
- Support reflection without guilt or pressure.
`.trim();

export function buildFaithValuesPromptBlock(
  prefs: FaithValuesPreferences,
  options: {
    todayIntention?: string | null;
    approvedReflectionSnippet?: string | null;
    prayerDay?: PrayerRoutineDay | null;
  },
): string {
  if (!prefs.enabled || prefs.mode === 'off' || !prefs.faithAwareLanguage) {
    return '';
  }

  const lines: string[] = [
    '## Faith & values (user opted in — respect privacy and boundaries)',
    `- Mode: ${faithModeLabel(prefs.mode)}`,
    '- Do NOT mention faith topics unless relevant to the user\'s message.',
    '- Never include faith content in casual unrelated replies.',
  ];

  if (prefs.mode === 'islam') {
    lines.push(ISLAM_PROMPT_SAFETY);
  } else {
    lines.push(GENERAL_VALUES_PROMPT_SAFETY);
  }

  if (options.todayIntention?.trim()) {
    lines.push(`- Today's intention (user-set): ${options.todayIntention.trim().slice(0, 200)}`);
  }

  if (options.approvedReflectionSnippet?.trim()) {
    lines.push(
      `- User explicitly allowed this reflection in memory: ${options.approvedReflectionSnippet.trim().slice(0, 280)}`,
    );
  }

  if (prefs.mode === 'islam' && options.prayerDay) {
    const done = PRAYER_ORDER.filter((p) => options.prayerDay!.completed[p]).length;
    lines.push(`- Prayer routine today (manual tracking only): ${done}/5 marked — do not guilt or assume times.`);
  }

  lines.push('- Private reflections, duas, and prayer logs are NOT in context unless listed above.');

  return lines.join('\n');
}

export async function buildFaithValuesPromptBlockFromService(
  service: FaithValuesService,
  userId: string,
): Promise<string> {
  const prefs = await service.getPreferences(userId);
  if (!prefs.enabled || prefs.mode === 'off' || !prefs.faithAwareLanguage) {
    return '';
  }

  const [intention, approved, prayerDay] = await Promise.all([
    service.getTodayIntention(userId),
    service.listMemoryApprovedReflections(userId),
    prefs.mode === 'islam' ? service.getPrayerDay(userId) : Promise.resolve(null),
  ]);

  const latestApproved = approved[0];
  const snippet = latestApproved?.body.slice(0, 280) ?? null;

  return buildFaithValuesPromptBlock(prefs, {
    todayIntention: intention?.text ?? null,
    approvedReflectionSnippet: snippet,
    prayerDay,
  });
}

export function reflectionPromptsForMode(mode: FaithValuesMode): string[] {
  if (mode === 'islam') {
    return [
      'What are you grateful to Allah for today?',
      'What intention do you want to carry into tomorrow?',
      'Is there something you want to make dua for?',
      'What helped you feel grounded today?',
      'What value do you want to practise tomorrow?',
    ];
  }
  return [
    'What are you grateful for today?',
    'What intention do you want to carry into tomorrow?',
    'What helped you feel grounded today?',
    'What value do you want to practise tomorrow?',
    'What act of kindness could you offer today?',
  ];
}

export function isFaithAnalyticsSafe(props: Record<string, unknown>): boolean {
  const blocked = /(dua|reflection|prayer|faith.?text|body|content|quote)/i;
  return !Object.keys(props).some((k) => blocked.test(k));
}

export function approvedReflectionForMemory(reflection: FaithReflection): boolean {
  return reflection.allowMemory && reflection.body.trim().length > 0;
}
