/**
 * OpenAI-compatible gateway message content (text or multimodal user turn).
 * Kept in src/ so client TypeScript can import it (supabase/functions is tsc-excluded).
 * Server-side validation lives in supabase/functions/_shared/usage-guard.ts and must stay aligned.
 */

export type GatewayTextPart = { type: 'text'; text: string };
export type GatewayImageUrlPart = { type: 'image_url'; image_url: { url: string } };
export type GatewayContentPart = GatewayTextPart | GatewayImageUrlPart;
export type GatewayMessageContent = string | GatewayContentPart[];

export const CLIENT_VISION_LIMITS = {
  maxVisionImageBytes: 4 * 1024 * 1024,
} as const;

export const ALLOWED_VISION_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

/** Count only textual characters — ignore base64 image payloads for text budgets. */
export function textCharsFromContent(content: GatewayMessageContent): number {
  if (typeof content === 'string') return content.length;
  let total = 0;
  for (const part of content) {
    if (part.type === 'text') total += part.text.length;
  }
  return total;
}

const VISION_DATA_URL_RE =
  /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/i;

export type VisionImageCheck =
  | { allowed: true }
  | { allowed: false; code: 'invalid_image' | 'image_too_large'; message: string };

export function validateVisionImageDataUrl(url: string): VisionImageCheck {
  if (typeof url !== 'string' || !url.trim()) {
    return { allowed: false, code: 'invalid_image', message: 'Invalid image payload.' };
  }
  if (/^https?:\/\//i.test(url)) {
    return {
      allowed: false,
      code: 'invalid_image',
      message: 'Remote image URLs are not allowed.',
    };
  }
  if (url.length > CLIENT_VISION_LIMITS.maxVisionImageBytes * 2) {
    return { allowed: false, code: 'image_too_large', message: 'Image exceeds maximum size.' };
  }

  const match = VISION_DATA_URL_RE.exec(url.trim());
  if (!match) {
    return { allowed: false, code: 'invalid_image', message: 'Invalid image payload.' };
  }

  const mime = match[1].toLowerCase();
  if (!(ALLOWED_VISION_MIME_TYPES as readonly string[]).includes(mime)) {
    return { allowed: false, code: 'invalid_image', message: 'Invalid image payload.' };
  }

  const base64 = match[2].replace(/\s+/g, '');
  if (!base64 || base64.length % 4 !== 0) {
    return { allowed: false, code: 'invalid_image', message: 'Invalid image payload.' };
  }

  const decodedBytes = Math.floor((base64.length * 3) / 4);
  if (decodedBytes > CLIENT_VISION_LIMITS.maxVisionImageBytes) {
    return { allowed: false, code: 'image_too_large', message: 'Image exceeds maximum size.' };
  }

  return { allowed: true };
}
