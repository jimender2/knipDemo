import { z } from 'zod';
import { newId } from '../util/ids.js';

const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export const STATUSES = ['todo', 'doing', 'done'] as const;

export const prioritySchema = z.enum(PRIORITIES);
export const statusSchema = z.enum(STATUSES);

const tagSchema = z
  .string()
  .min(1)
  .max(24)
  .regex(/^[\w-]+$/, 'tags may only contain letters, numbers, _ and -');

export const cardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(120),
  notes: z.string().max(2000).default(''),
  status: statusSchema.default('todo'),
  priority: prioritySchema.default('normal'),
  tags: z.array(tagSchema).max(8).default([]),
  due: z.string().datetime().nullable().default(null),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable().default(null),
});

export type Priority = z.infer<typeof prioritySchema>;
export type Status = z.infer<typeof statusSchema>;
export type Card = z.infer<typeof cardSchema>;

export const cardDraftSchema = cardSchema
  .pick({ title: true, notes: true, status: true, priority: true, tags: true, due: true })
  .partial();

export type CardDraft = z.infer<typeof cardDraftSchema>;

export function createCard(draft: CardDraft = {}): Card {
  const now = new Date().toISOString();
  const parsed = cardDraftSchema.parse(draft);
  return {
    id: newId(),
    title: parsed.title ?? 'Untitled card',
    notes: parsed.notes ?? '',
    status: parsed.status ?? 'todo',
    priority: parsed.priority ?? 'normal',
    tags: [...(parsed.tags ?? [])],
    due: parsed.due ?? null,
    createdAt: now,
    updatedAt: now,
    completedAt: parsed.status === 'done' ? now : null,
  };
}

export function applyUpdate(card: Card, patch: Partial<CardDraft>): Card {
  const merged = cardSchema.parse({ ...card, ...stripUndefined(patch) });
  const statusChanged = merged.status !== card.status;
  const completedAt =
    statusChanged && merged.status === 'done'
      ? new Date().toISOString()
      : statusChanged
        ? null
        : card.completedAt;

  return { ...merged, completedAt, updatedAt: new Date().toISOString() };
}

export function toggleCard(card: Card): Card {
  const next: Status = card.status === 'done' ? 'todo' : 'done';
  return applyUpdate(card, { status: next });
}

function stripUndefined<T extends object>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}
