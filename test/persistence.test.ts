import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createCard } from '../src/core/card.js';
import { loadCards, saveCards } from '../src/core/persistence.js';

let dir: string;
let path: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'cards-'));
  path = join(dir, 'nested', 'cards.json');
  await mkdir(dirname(path), { recursive: true });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('loadCards / saveCards', () => {
  it('returns an empty list when the file is missing', async () => {
    expect(await loadCards(path)).toEqual([]);
  });

  it('round-trips cards, creating directories as needed', async () => {
    const cards = [createCard({ title: 'one', tags: ['a'] }), createCard({ title: 'two' })];
    await saveCards(cards, path);
    expect(await loadCards(path)).toEqual(cards);
  });

  it('throws on malformed JSON rather than silently dropping data', async () => {
    await writeFile(path, '{not json', 'utf8');
    await expect(loadCards(path)).rejects.toThrow(SyntaxError);
  });

  it('returns an empty list for a non-array payload', async () => {
    await writeFile(path, '{"cards":[]}', 'utf8');
    expect(await loadCards(path)).toEqual([]);
  });

  it('drops individual invalid entries but keeps valid ones', async () => {
    const good = createCard({ title: 'keeper' });
    await writeFile(path, JSON.stringify([good, { id: 'broken' }, null, 42]), 'utf8');
    expect(await loadCards(path)).toEqual([good]);
  });
});
