import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { cardSchema, type Card } from './card.js';

export const DEFAULT_DATA_PATH = resolve(process.cwd(), 'data/cards.json');

export async function loadCards(path: string = DEFAULT_DATA_PATH): Promise<Card[]> {
  try {
    const raw = await readFile(path, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry) => {
      const result = cardSchema.safeParse(entry);
      return result.success ? [result.data] : [];
    });
  } catch (error) {
    if (isNotFound(error)) return [];
    throw error;
  }
}

export async function saveCards(
  cards: readonly Card[],
  path: string = DEFAULT_DATA_PATH,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(cards, null, 2)}\n`, 'utf8');
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}
