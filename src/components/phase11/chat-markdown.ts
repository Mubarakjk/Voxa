export type ChatMarkdownBlock =
  | { type: 'code'; text: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'numbered'; items: string[] }
  | { type: 'table'; rows: string[] }
  | { type: 'paragraph'; text: string };

export type BoldSegment = { text: string; bold: boolean };

const BOLD_PATTERN = /\*\*([^*\n]+)\*\*/g;

/** Split **bold** markers into segments. Unmatched asterisks stay as text. */
export function splitBoldSegments(text: string): BoldSegment[] {
  const segments: BoldSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(BOLD_PATTERN)) {
    const index = match.index ?? 0;
    if (index > last) segments.push({ text: text.slice(last, index), bold: false });
    segments.push({ text: match[1] ?? '', bold: true });
    last = index + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), bold: false });
  if (segments.length === 0) segments.push({ text, bold: false });
  return segments;
}

export function visibleMarkdownText(text: string): string {
  return splitBoldSegments(text)
    .map((segment) => segment.text)
    .join('');
}

/** Same block rules as the Talk renderer: code, bullets, numbers, tables, paragraphs. */
export function parseChatMarkdownBlocks(text: string): ChatMarkdownBlock[] {
  const blocks: ChatMarkdownBlock[] = [];
  for (const block of text.split(/\n\n+/)) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('```')) {
      blocks.push({
        type: 'code',
        text: trimmed.replace(/^```\w*\n?/, '').replace(/```$/, ''),
      });
      continue;
    }

    if (/^[-*]\s/m.test(trimmed)) {
      blocks.push({
        type: 'bullets',
        items: trimmed
          .split('\n')
          .filter((line) => /^[-*]\s/.test(line))
          .map((line) => line.replace(/^[-*]\s/, '')),
      });
      continue;
    }

    if (/^\d+\.\s/m.test(trimmed)) {
      blocks.push({
        type: 'numbered',
        items: trimmed.split('\n').filter((line) => /^\d+\.\s/.test(line)),
      });
      continue;
    }

    if (trimmed.startsWith('|') && trimmed.includes('|')) {
      blocks.push({
        type: 'table',
        rows: trimmed.split('\n').filter((row) => row.includes('|')).slice(0, 6),
      });
      continue;
    }

    blocks.push({ type: 'paragraph', text: trimmed });
  }
  return blocks;
}
