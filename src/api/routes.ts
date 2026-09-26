import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { cardDraftSchema, prioritySchema, statusSchema } from '../core/card.js';
import { computeStats, filterCards, sortCards, type CardFilter } from '../core/selectors.js';
import { CardNotFoundError, type CardStore } from '../core/store.js';
import { log } from '../util/logger.js';

const listQuerySchema = z.object({
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
  overdueOnly: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

export function registerCardRoutes(app: FastifyInstance, store: CardStore): void {
  app.get('/health', async () => ({ ok: true, cards: store.size }));

  app.get('/api/cards', async (request) => {
    const query = listQuerySchema.parse(request.query);
    const filter: CardFilter = omitUndefined({
      status: query.status,
      priority: query.priority,
      tag: query.tag,
      search: query.search,
      overdueOnly: query.overdueOnly,
    });
    return { cards: sortCards(filterCards(store.all(), filter)) };
  });

  app.get('/api/cards/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const card = store.find(id);
    if (card === undefined) {
      return reply.code(404).send({ error: 'not_found', id });
    }
    return { card };
  });

  app.post('/api/cards', async (request, reply) => {
    const draft = cardDraftSchema.parse(request.body ?? {});
    const card = store.add(draft);
    return reply.code(201).send({ card });
  });

  app.patch('/api/cards/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const patch = cardDraftSchema.partial().parse(request.body ?? {});
    try {
      return { card: store.update(id, patch) };
    } catch (error) {
      return handleStoreError(error, reply, id);
    }
  });

  app.post('/api/cards/:id/toggle', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    try {
      return { card: store.toggle(id) };
    } catch (error) {
      return handleStoreError(error, reply, id);
    }
  });

  app.delete('/api/cards/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    try {
      store.remove(id);
      return reply.code(204).send();
    } catch (error) {
      return handleStoreError(error, reply, id);
    }
  });

  app.post('/api/cards/clear-completed', async (_request, reply) => {
    return { removed: store.clearCompleted() };
  });

  app.get('/api/stats', async () => ({ stats: computeStats(store.all()) }));
}

type WithoutUndefined<T> = { [K in keyof T]-?: Exclude<T[K], undefined> };

function omitUndefined<T extends object>(input: T): Partial<WithoutUndefined<T>> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<WithoutUndefined<T>>;
}

function handleStoreError(
  error: unknown,
  reply: { code: (status: number) => { send: (body: unknown) => unknown } },
  id: string,
): unknown {
  if (error instanceof CardNotFoundError) {
    log.warn(`card not found: ${id}`);
    return reply.code(404).send({ error: 'not_found', id });
  }
  throw error;
}
