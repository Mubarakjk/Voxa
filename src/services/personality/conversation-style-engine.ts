import { ConversationStyleProfile } from '../../types/relationship-personality';
import { nowIso } from '../../types';

const MAX_NUDGE = 0.05;

export class ConversationStyleEngine {
  learn(input: {
    style: ConversationStyleProfile;
    userMessage: string;
    voxaReply: string;
  }): ConversationStyleProfile {
    const words = input.userMessage.split(/\s+/).length;
    const lower = input.userMessage.toLowerCase();
    const hasBullets = /^[\s]*[-•*]/m.test(input.userMessage) || lower.includes('bullet');

    let style = { ...input.style };

    if (words <= 8) {
      style.prefersShortAnswers = nudge(style.prefersShortAnswers, 0.85);
      style.prefersLongExplanations = nudge(style.prefersLongExplanations, 0.2);
    } else if (words >= 25) {
      style.prefersLongExplanations = nudge(style.prefersLongExplanations, 0.85);
      style.prefersShortAnswers = nudge(style.prefersShortAnswers, 0.25);
    }

    if (hasBullets) {
      style.prefersBulletPoints = nudge(style.prefersBulletPoints, 0.9);
    }

    if (/please|would you|could you|thanks|regards/.test(lower)) {
      style.professionalTone = nudge(style.professionalTone, 0.75);
    }
    if (/hey|yo|lol|mate|buddy|gonna|wanna/.test(lower)) {
      style.casualTone = nudge(style.casualTone, 0.8);
    }
    if (/motivat|you got this|let's go|push through/.test(lower)) {
      style.motivationalTone = nudge(style.motivationalTone, 0.8);
    }

    return { ...style, updatedAt: nowIso() };
  }

  toPromptGuidance(style: ConversationStyleProfile): string {
    const parts: string[] = [];

    if (style.prefersShortAnswers > 0.65) parts.push('Keep replies concise — 1–2 short paragraphs max.');
    if (style.prefersLongExplanations > 0.65) parts.push('User appreciates thoughtful, fuller explanations when helpful.');
    if (style.prefersBulletPoints > 0.55) parts.push('Use bullet points when listing steps or options.');
    if (style.casualTone > 0.6) parts.push('Casual, friendly tone.');
    if (style.professionalTone > 0.6) parts.push('Clear, professional tone.');
    if (style.motivationalTone > 0.6) parts.push('Warm motivational tone without pressure.');

    return parts.length > 0 ? parts.join(' ') : 'Natural, balanced tone.';
  }
}

function nudge(current: number, target: number) {
  const delta = Math.sign(target - current) * Math.min(Math.abs(target - current), MAX_NUDGE);
  return Math.min(1, Math.max(0, current + delta));
}

export const conversationStyleEngine = new ConversationStyleEngine();
