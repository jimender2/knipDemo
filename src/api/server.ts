import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { loadCards, saveCards } from '../core/persistence.js';
import { CardStore } from '../core/store.js';
import { log } from '../util/logger.js';
import { registerCardRoutes } from './routes.js';

export interface ServerOptions {
  logger?: boolean;
  persist?: boolean;
}

export async function buildStore(options: ServerOptions = {}): Promise<CardStore> {
  const initial = options.persist === false ? [] : await loadCards();
  return new CardStore(initial);
}

export async function buildServer(options: ServerOptions = {}): Promise<FastifyInstance> {
  const store = await buildStore(options);
  const app = Fastify({ logger: options.logger ?? false });

  await app.register(cors, { origin: true });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: 'invalid_request',
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    // A malformed request is the caller's fault, not ours. Fastify attaches a
    // 4xx statusCode to things like FST_ERR_CTP_EMPTY_JSON_BODY; without this
    // branch they all surfaced as 500 internal_error and were impossible to
    // tell apart from a genuine server fault.
    const status = statusOf(error);
    if (status !== undefined && status >= 400 && status < 500) {
      return reply.code(status).send({
        error: 'invalid_request',
        message: error instanceof Error ? error.message : 'request rejected',
      });
    }
    log.error(`${request.method} ${request.url} failed`, error);
    return reply.code(500).send({ error: 'internal_error' });
  });

  registerCardRoutes(app, store);

  if (options.persist !== false) {
    store.on('change', (cards) => {
      void saveCards(cards).catch((error: unknown) => {
        log.error('failed to persist cards', error);
      });
    });
  }

  return app;
}

function statusOf(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const { statusCode } = error as { statusCode?: unknown };
  return typeof statusCode === 'number' ? statusCode : undefined;
}
