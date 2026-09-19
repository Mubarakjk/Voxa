/**
 * One-shot Talk composer prefill from navigation (Home quick actions, etc.).
 * Never auto-sends; never overwrites text the user has already typed.
 * Pending starters win over an empty composer and over a restored draft.
 */

export function composerTextAfterStarterPrefill(input: {
  pendingStarter: string | null | undefined;
  currentComposer: string;
  restoredDraft?: string | null;
}): { nextComposer: string; consumed: boolean } {
  const starter = (input.pendingStarter ?? '').trim();
  if (!starter) {
    return { nextComposer: input.currentComposer, consumed: false };
  }

  const current = input.currentComposer;
  const draft = (input.restoredDraft ?? '').trim();
  const currentTrimmed = current.trim();

  // Keep real typed text; consume so navigation state does not linger.
  if (currentTrimmed && (!draft || currentTrimmed !== draft)) {
    return { nextComposer: current, consumed: true };
  }

  return { nextComposer: starter, consumed: true };
}

export function composerTextAfterDraftRestore(input: {
  currentComposer: string;
  draft: string | null | undefined;
  pendingStarter: string | null | undefined;
}): { nextComposer: string; clearStarter: boolean } {
  const draft = (input.draft ?? '').trim();
  if (!draft && !(input.pendingStarter ?? '').trim()) {
    return { nextComposer: input.currentComposer, clearStarter: false };
  }

  const withStarter = composerTextAfterStarterPrefill({
    pendingStarter: input.pendingStarter,
    currentComposer: input.currentComposer,
    restoredDraft: draft || null,
  });

  if (withStarter.consumed) {
    return { nextComposer: withStarter.nextComposer, clearStarter: true };
  }

  if (!input.currentComposer.trim() && draft) {
    return { nextComposer: draft, clearStarter: false };
  }

  return { nextComposer: input.currentComposer, clearStarter: false };
}
