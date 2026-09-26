import { describe, expect, it } from 'vitest';
import { applyUpdate, cardSchema, createCard, toggleCard } from '../src/core/card.js';

describe('createCard', () => {
  it('applies sensible defaults', () => {
    const card = createCard({ title: 'Write docs' });
    expect(card).toMatchObject({
      title: 'Write docs',
      notes: '',
      status: 'todo',
      priority: 'normal',
      tags: [],
      due: null,
      completedAt: null,
    });
    expect(card.id).toMatch(/^c_/);
  });

  it('stamps completedAt when created as done', () => {
    const card = createCard({ title: 'Already done', status: 'done' });
    expect(card.completedAt).not.toBeNull();
  });

  it('copies the tags array instead of aliasing it', () => {
    const tags = ['a'];
    const card = createCard({ title: 'x', tags });
    tags.push('b');
    expect(card.tags).toEqual(['a']);
  });

  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 200 }, () => createCard({ title: 'x' }).id));
    expect(ids.size).toBe(200);
  });

  it('rejects an empty title', () => {
    expect(() => createCard({ title: '' })).toThrow();
  });

  it('rejects unknown tags', () => {
    expect(() => createCard({ title: 'x', tags: ['not valid!'] })).toThrow();
  });
});

describe('applyUpdate', () => {
  it('bumps updatedAt and keeps id', () => {
    const card = createCard({ title: 'before' });
    const updated = applyUpdate(card, { title: 'after' });
    expect(updated.title).toBe('after');
    expect(updated.id).toBe(card.id);
    expect(Date.parse(updated.updatedAt)).toBeGreaterThanOrEqual(Date.parse(card.updatedAt));
  });

  it('sets completedAt when moving to done', () => {
    const card = createCard({ title: 'x' });
    const done = applyUpdate(card, { status: 'done' });
    expect(done.completedAt).not.toBeNull();
  });

  it('clears completedAt when moving away from done', () => {
    const done = createCard({ title: 'x', status: 'done' });
    const reopened = applyUpdate(done, { status: 'doing' });
    expect(reopened.completedAt).toBeNull();
  });

  it('preserves completedAt for unrelated updates', () => {
    const done = createCard({ title: 'x', status: 'done' });
    const retitled = applyUpdate(done, { title: 'y' });
    expect(retitled.completedAt).toBe(done.completedAt);
  });

  it('ignores undefined patches', () => {
    const card = createCard({ title: 'keep', notes: 'mine' });
    const updated = applyUpdate(card, { title: undefined, notes: 'new' });
    expect(updated.title).toBe('keep');
    expect(updated.notes).toBe('new');
  });
});

describe('toggleCard', () => {
  it('flips between done and todo', () => {
    const card = createCard({ title: 'x' });
    expect(toggleCard(card).status).toBe('done');
    expect(toggleCard(toggleCard(card)).status).toBe('todo');
  });
});

describe('cardSchema', () => {
  it('round-trips a created card', () => {
    const card = createCard({ title: 'x', tags: ['one', 'two'], due: new Date().toISOString() });
    expect(cardSchema.parse(card)).toEqual(card);
  });
});
