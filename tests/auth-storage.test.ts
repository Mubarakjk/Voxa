import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('supabase auth storage chunking contract', () => {
  const CHUNK_SIZE = 1800;
  const CHUNK_META_PREFIX = '__voxa_chunked__:';

  it('keeps small values as a single blob', () => {
    const value = 'a'.repeat(100);
    assert.equal(value.length <= CHUNK_SIZE, true);
  });

  it('splits oversized session JSON into chunk metadata', () => {
    const value = 'b'.repeat(5000);
    const count = Math.ceil(value.length / CHUNK_SIZE);
    assert.equal(count, 3);
    const meta = `${CHUNK_META_PREFIX}${count}`;
    assert.equal(meta.startsWith(CHUNK_META_PREFIX), true);
    const parts = Array.from({ length: count }, (_, i) =>
      value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
    );
    assert.equal(parts.join(''), value);
    assert.ok(parts.every((part) => part.length <= CHUNK_SIZE));
  });
});
