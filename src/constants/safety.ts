/**
 * Safety copy Voxa must surface in sensitive modes and future onboarding.
 * Voxa is a companion — not a licensed therapist or emergency service.
 */
export const VOXA_SAFETY = {
  notTherapist:
    'Voxa is an AI companion and is not a licensed therapist, doctor, or emergency service.',
  notEmergency:
    'If you are in immediate danger or need emergency help, contact local emergency services right away.',
  safeCallDisclaimer:
    'Safe Call mode offers supportive check-ins. It does not replace professional care or emergency response.',
  reflectionDisclaimer:
    'Reflection mode offers emotional support, not clinical mental health treatment.',
} as const;

export const VOXA_SAFETY_SHORT = VOXA_SAFETY.notTherapist;
