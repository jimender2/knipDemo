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

export async function buildServer(
  options: ServerOptions = {},
): Promise<FastifyInstance> {
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
