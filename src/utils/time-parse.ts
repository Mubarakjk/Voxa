export type ParsedTime = {
  hour: number;
  minute: number;
  /** 24-hour HH:mm */
  formatted: string;
};

/**
 * Parse flexible time strings: 7am, 7:00am, 07:00, 23:30, 11:30 pm
 */
export function parseFlexibleTimeInput(input: string): ParsedTime | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  const twelveHour = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (twelveHour) {
    let hour = Number(twelveHour[1]);
    const minute = twelveHour[2] ? Number(twelveHour[2]) : 0;
    const meridiem = twelveHour[3].toLowerCase();
    if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    return toParsedTime(hour, minute);
  }

  const twentyFour = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFour) {
    const hour = Number(twentyFour[1]);
    const minute = Number(twentyFour[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return toParsedTime(hour, minute);
  }

  const bareMeridiem = trimmed.match(/^(\d{1,2})\s*(am|pm)$/i);
  if (bareMeridiem) {
    let hour = Number(bareMeridiem[1]);
    const meridiem = bareMeridiem[2].toLowerCase();
    if (hour < 1 || hour > 12) return null;
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    return toParsedTime(hour, 0);
  }

  return null;
}

export function formatTime12Hour(hour: number, minute: number): string {
  const meridiem = hour >= 12 ? 'pm' : 'am';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const minutePart = minute === 0 ? '' : `:${String(minute).padStart(2, '0')}`;
  return `${displayHour}${minutePart}${meridiem}`;
}

export function validateAgeInput(input: string): { valid: true; value?: number } | { valid: false; error: string } {
  const trimmed = input.trim();
  if (!trimmed) return { valid: true };

  if (!/^\d{1,3}$/.test(trimmed)) {
    return { valid: false, error: 'Age must be a whole number.' };
  }

  const value = Number(trimmed);
  if (value < 13 || value > 120) {
    return { valid: false, error: 'Please enter an age between 13 and 120.' };
  }

  return { valid: true, value };
}

function toParsedTime(hour: number, minute: number): ParsedTime {
  return {
    hour,
    minute,
    formatted: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  };
}
