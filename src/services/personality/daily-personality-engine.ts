import { DailyPersonalityModifier } from '../../types/relationship-personality';

export class DailyPersonalityEngine {
  resolve(now = new Date()): DailyPersonalityModifier {
    const hour = now.getHours();
    const day = now.getDay();
    const isWeekend = day === 0 || day === 6;
    const isWorkHours = !isWeekend && hour >= 9 && hour < 17;

    let energy = 0.5;
    let relaxation = 0.5;
    let conversational = 0.5;
    let productivityFocus = 0.4;
    let label = 'Balanced';
    let guidance = 'Be naturally adaptive.';

    if (hour >= 6 && hour < 11) {
      energy = 0.75;
      relaxation = 0.35;
      label = 'Morning energy';
      guidance = 'Slightly more energetic and forward-looking. Gentle momentum, not hype.';
    } else if (hour >= 20 || hour < 6) {
      energy = 0.35;
      relaxation = 0.8;
      label = 'Evening calm';
      guidance = 'More relaxed, reflective, unhurried. Soft landing energy.';
    }

    if (isWeekend) {
      conversational = 0.8;
      productivityFocus = 0.25;
      label = isWeekend && hour < 12 ? 'Weekend morning' : 'Weekend mode';
      guidance += ' More conversational, less task-focused unless asked.';
    }

    if (isWorkHours) {
      productivityFocus = 0.7;
      conversational = 0.45;
      label = 'Focus hours';
      guidance += ' Slightly more productivity-aware when relevant.';
    }

    return {
      energy,
      relaxation,
      conversational,
      productivityFocus,
      label,
      guidance,
    };
  }
}

export const dailyPersonalityEngine = new DailyPersonalityEngine();
