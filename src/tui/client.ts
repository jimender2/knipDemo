import { z } from 'zod';
import { cardSchema, type Card, type CardDraft } from '../core/card.js';
import type { CardStats } from '../core/selectors.js';

const cardsResponseSchema = z.object({ cards: z.array(cardSchema) });
const cardResponseSchema = z.object({ card: cardSchema });
const statsResponseSchema = z.object({
  stats: z.object({
    total: z.number(),
    done: z.number(),
    todo: z.number(),
    doing: z.number(),
    overdue: z.number(),
    byPriority: z.record(z.string(), z.number()),
  }),
});

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(url: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    // Only claim a JSON body when there actually is one. Fastify rejects an
    // empty payload with FST_ERR_CTP_EMPTY_JSON_BODY if content-type is set,
    // which turned every bodyless DELETE and POST into a 500.
    headers: {
      ...(init?.body === undefined ? {} : { 'content-type': 'application/json' }),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(`${init?.method ?? 'GET'} ${url} -> ${response.status}`, response.status);
  }
  if (response.status === 204) return undefined as T;

  return schema.parse(await response.json());
}

export class CardsClient {
  constructor(private readonly baseUrl: string) {}

  list(): Promise<Card[]> {
    return request(`${this.baseUrl}/api/cards`, cardsResponseSchema).then((r) => r.cards);
  }

  stats(): Promise<CardStats> {
    return request(`${this.baseUrl}/api/stats`, statsResponseSchema).then((r) => r.stats);
  }

  add(title: string): Promise<Card> {
    return request(`${this.baseUrl}/api/cards`, cardResponseSchema, {
      method: 'POST',
      body: JSON.stringify({ title }),
    }).then((r) => r.card);
  }

  toggle(id: string): Promise<Card> {
    return request(`${this.baseUrl}/api/cards/${id}/toggle`, cardResponseSchema, {
      method: 'POST',
    }).then((r) => r.card);
  }

  update(id: string, patch: Partial<CardDraft>): Promise<Card> {
    return request(`${this.baseUrl}/api/cards/${id}`, cardResponseSchema, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }).then((r) => r.card);
  }

  remove(id: string): Promise<void> {
    return request(`${this.baseUrl}/api/cards/${id}`, z.undefined(), { method: 'DELETE' });
  }
}
