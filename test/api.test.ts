import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance, InjectOptions } from 'fastify';
import { buildServer } from '../src/api/server.js';
import type { Card } from '../src/core/card.js';
import type { CardStats } from '../src/core/selectors.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildServer({ persist: false });
});

afterAll(async () => {
  await app.close();
});

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

async function req(method: Method, url: string, payload?: Record<string, unknown>) {
  const options: InjectOptions = payload === undefined ? { method, url } : { method, url, payload };
  return app.inject(options);
}

async function body<T>(method: Method, url: string, payload?: Record<string, unknown>): Promise<T> {
  const response = await req(method, url, payload);
  return response.json() as T;
}

async function makeCard(payload: Record<string, unknown>): Promise<Card> {
  const { card } = await body<{ card: Card }>('POST', '/api/cards', payload);
  return card;
}

async function listCards(): Promise<Card[]> {
  const { cards } = await body<{ cards: Card[] }>('GET', '/api/cards');
  return cards;
}

async function reset(): Promise<void> {
  for (const card of await listCards()) {
    await req('DELETE', `/api/cards/${card.id}`);
  }
}

describe('card API', () => {
  beforeEach(reset);

  it('reports health', async () => {
    expect(await body('GET', '/health')).toEqual({ ok: true, cards: 0 });
  });

  it('creates a card and returns 201', async () => {
    const response = await req('POST', '/api/cards', {
      title: 'Created',
      priority: 'high',
      tags: ['x'],
    });
    expect(response.statusCode).toBe(201);
    expect(response.json().card).toMatchObject({
      title: 'Created',
      priority: 'high',
      tags: ['x'],
    });
  });

  it('rejects an invalid payload with 400 and issue details', async () => {
    const response = await req('POST', '/api/cards', { title: 'Created', priority: 'nope' });
    expect(response.statusCode).toBe(400);
    const parsed = response.json();
    expect(parsed.error).toBe('invalid_request');
    expect(parsed.issues[0].path).toBe('priority');
  });

  it('sorts open cards by priority and pushes done cards last', async () => {
    await makeCard({ title: 'one', priority: 'low' });
    await makeCard({ title: 'two', priority: 'urgent', status: 'done' });
    await makeCard({ title: 'three' });

    expect((await listCards()).map((c) => c.title)).toEqual(['three', 'one', 'two']);
  });

  it('filters by status', async () => {
    await makeCard({ title: 'open' });
    await makeCard({ title: 'closed', status: 'done' });
    const { cards } = await body<{ cards: Card[] }>('GET', '/api/cards?status=todo');
    expect(cards.map((c) => c.title)).toEqual(['open']);
  });

  it('filters by search', async () => {
    await makeCard({ title: 'write tests' });
    await makeCard({ title: 'buy milk' });
    const { cards } = await body<{ cards: Card[] }>('GET', '/api/cards?search=tests');
    expect(cards.map((c) => c.title)).toEqual(['write tests']);
  });

  it('filters by tag', async () => {
    await makeCard({ title: 'tagged', tags: ['work'] });
    await makeCard({ title: 'plain' });
    const { cards } = await body<{ cards: Card[] }>('GET', '/api/cards?tag=work');
    expect(cards.map((c) => c.title)).toEqual(['tagged']);
  });

  it('filters by overdueOnly', async () => {
    await makeCard({ title: 'late', due: '2020-01-01T00:00:00.000Z' });
    await makeCard({ title: 'fresh' });
    const { cards } = await body<{ cards: Card[] }>('GET', '/api/cards?overdueOnly=true');
    expect(cards.map((c) => c.title)).toEqual(['late']);
  });

  it('returns 404 for an unknown card', async () => {
    const response = await req('GET', '/api/cards/nope');
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'not_found', id: 'nope' });
  });

  it('gets a single card', async () => {
    const created = await makeCard({ title: 'fetch me' });
    const { card } = await body<{ card: Card }>('GET', `/api/cards/${created.id}`);
    expect(card.title).toBe('fetch me');
  });

  it('patches a card', async () => {
    const created = await makeCard({ title: 'patch me' });
    const { card } = await body<{ card: Card }>('PATCH', `/api/cards/${created.id}`, {
      title: 'patched',
    });
    expect(card.title).toBe('patched');
    expect(card.id).toBe(created.id);
  });

  it('toggles a card', async () => {
    const created = await makeCard({ title: 'toggle me' });
    const { card } = await body<{ card: Card }>('POST', `/api/cards/${created.id}/toggle`);
    expect(card.status).toBe('done');
  });

  it('deletes with 204', async () => {
    const created = await makeCard({ title: 'bye' });
    const response = await req('DELETE', `/api/cards/${created.id}`);
    expect(response.statusCode).toBe(204);
    expect(await listCards()).toEqual([]);
  });

  it('returns 404 when mutating an unknown card', async () => {
    const attempts: InjectOptions[] = [
      { method: 'PATCH', url: '/api/cards/nope', payload: { title: 'x' } },
      { method: 'POST', url: '/api/cards/nope/toggle' },
      { method: 'DELETE', url: '/api/cards/nope' },
    ];
    for (const attempt of attempts) {
      expect((await app.inject(attempt)).statusCode).toBe(404);
    }
  });

  it('clears completed cards and reports the count', async () => {
    await makeCard({ title: 'keep' });
    await makeCard({ title: 'drop', status: 'done' });

    expect(await body('POST', '/api/cards/clear-completed')).toEqual({ removed: 1 });

    const { stats } = await body<{ stats: CardStats }>('GET', '/api/stats');
    expect(stats.total).toBe(1);
  });
});
