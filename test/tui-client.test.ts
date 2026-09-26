import { afterEach, describe, expect, it, vi } from 'vitest';
import { CardsClient } from '../src/tui/client.js';
import type { Card } from '../src/core/card.js';

const card: Card = {
  id: 'c_1',
  title: 'a card',
  notes: '',
  status: 'todo',
  priority: 'normal',
  tags: [],
  due: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  completedAt: null,
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function noContent(): Response {
  return { ok: true, status: 204, json: async () => undefined } as Response;
}

/** Capture the init passed to fetch, so we can assert on the headers sent. */
function captureFetch(response: Response) {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  const spy = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return response;
  });
  vi.stubGlobal('fetch', spy);
  return { calls, spy };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CardsClient headers', () => {
  it('omits content-type on bodyless requests so Fastify does not reject them', async () => {
    // Regression: the client used to set content-type: application/json on
    // every request. Fastify answers an empty body with
    // FST_ERR_CTP_EMPTY_JSON_BODY, so delete and toggle both failed with a
    // 500 even though the API was fine.
    const { calls } = captureFetch(noContent());
    const client = new CardsClient('http://127.0.0.1:4310');

    await client.remove('c_1');

    expect(calls).toHaveLength(1);
    const headers = calls[0]!.init?.headers as Record<string, string>;
    expect(headers['content-type']).toBeUndefined();
    expect(calls[0]!.init?.method).toBe('DELETE');
  });

  it('omits content-type on bodyless POST /toggle', async () => {
    const { calls } = captureFetch(jsonResponse({ card }));
    const client = new CardsClient('http://127.0.0.1:4310');

    await client.toggle('c_1');

    const headers = calls[0]!.init?.headers as Record<string, string>;
    expect(headers['content-type']).toBeUndefined();
  });

  it('sends content-type when there is a JSON body', async () => {
    const { calls } = captureFetch(jsonResponse({ card }));
    const client = new CardsClient('http://127.0.0.1:4310');

    await client.update('c_1', { title: 'renamed' });

    const headers = calls[0]!.init?.headers as Record<string, string>;
    expect(headers['content-type']).toBe('application/json');
    expect(calls[0]!.init?.method).toBe('PATCH');
    expect(JSON.parse(String(calls[0]!.init?.body))).toEqual({ title: 'renamed' });
  });
});

describe('CardsClient payloads', () => {
  it('unwraps the card from update', async () => {
    captureFetch(jsonResponse({ card }));
    const client = new CardsClient('http://127.0.0.1:4310');

    await expect(client.update('c_1', { status: 'done' })).resolves.toEqual(card);
  });

  it('sends the draft fields on add', async () => {
    const { calls } = captureFetch(jsonResponse({ card }));
    const client = new CardsClient('http://127.0.0.1:4310');

    await client.add('a card');

    expect(JSON.parse(String(calls[0]!.init?.body))).toEqual({ title: 'a card' });
  });

  it('throws ApiError with the status on failure', async () => {
    captureFetch({ ok: false, status: 404, json: async () => ({}) } as Response);
    const client = new CardsClient('http://127.0.0.1:4310');

    await expect(client.remove('missing')).rejects.toMatchObject({ status: 404 });
  });
});
