import { describe, expect, it } from 'vitest';
import { createCard, type Card } from '../src/core/card.js';
import { allTags, computeStats, filterCards, isOverdue, sortCards } from '../src/core/selectors.js';

const NOW = new Date('2026-06-15T12:00:00.000Z');

function card(over: Partial<Card> = {}): Card {
  return { ...createCard({ title: 'card' }), ...over };
}

describe('isOverdue', () => {
  it('is false without a due date', () => {
    expect(isOverdue(card(), NOW)).toBe(false);
  });

  it('is false for completed cards', () => {
    expect(isOverdue(card({ due: '2020-01-01T00:00:00.000Z', status: 'done' }), NOW)).toBe(false);
  });

  it('is true for a past due date on an open card', () => {
    expect(isOverdue(card({ due: '2020-01-01T00:00:00.000Z' }), NOW)).toBe(true);
  });
});

describe('filterCards', () => {
  const cards = [
    card({ title: 'alpha', status: 'todo', priority: 'low', tags: ['home'] }),
    card({ title: 'beta', status: 'doing', priority: 'urgent', tags: ['work', 'home'] }),
    card({ title: 'gamma', status: 'done', priority: 'high', notes: 'finished beta work' }),
    card({ title: 'delta', priority: 'normal', due: '2020-01-01T00:00:00.000Z' }),
  ];

  it('returns everything for an empty filter', () => {
    expect(filterCards(cards, {}, NOW)).toHaveLength(4);
  });

  it('filters by status', () => {
    expect(filterCards(cards, { status: 'done' }, NOW).map((c) => c.title)).toEqual(['gamma']);
  });

  it('filters by priority', () => {
    expect(filterCards(cards, { priority: 'urgent' }, NOW).map((c) => c.title)).toEqual(['beta']);
  });

  it('filters by tag', () => {
    expect(filterCards(cards, { tag: 'home' }, NOW).map((c) => c.title)).toEqual(['alpha', 'beta']);
  });

  it('searches title, notes and tags case-insensitively', () => {
    expect(filterCards(cards, { search: 'BETA' }, NOW).map((c) => c.title)).toEqual([
      'beta',
      'gamma',
    ]);
    expect(filterCards(cards, { search: 'work' }, NOW).map((c) => c.title)).toEqual([
      'beta',
      'gamma',
    ]);
  });

  it('ignores a whitespace-only search', () => {
    expect(filterCards(cards, { search: '   ' }, NOW)).toHaveLength(4);
  });

  it('filters overdue only', () => {
    expect(filterCards(cards, { overdueOnly: true }, NOW).map((c) => c.title)).toEqual(['delta']);
  });

  it('combines filters with AND', () => {
    expect(filterCards(cards, { status: 'todo', tag: 'home' }, NOW).map((c) => c.title)).toEqual([
      'alpha',
    ]);
  });
});

describe('sortCards', () => {
  it('puts done cards last', () => {
    const sorted = sortCards([
      card({ title: 'done', status: 'done', priority: 'low' }),
      card({ title: 'open', priority: 'low' }),
    ]);
    expect(sorted.map((c) => c.title)).toEqual(['open', 'done']);
  });

  it('orders by priority', () => {
    const sorted = sortCards([
      card({ title: 'low', priority: 'low' }),
      card({ title: 'urgent', priority: 'urgent' }),
      card({ title: 'normal', priority: 'normal' }),
      card({ title: 'high', priority: 'high' }),
    ]);
    expect(sorted.map((c) => c.title)).toEqual(['urgent', 'high', 'normal', 'low']);
  });

  it('breaks priority ties by due date, undated last', () => {
    const sorted = sortCards([
      card({ title: 'none' }),
      card({ title: 'later', due: '2026-07-01T00:00:00.000Z' }),
      card({ title: 'sooner', due: '2026-06-20T00:00:00.000Z' }),
    ]);
    expect(sorted.map((c) => c.title)).toEqual(['sooner', 'later', 'none']);
  });

  it('does not mutate the input', () => {
    const input = [card({ title: 'b', priority: 'low' }), card({ title: 'a', priority: 'urgent' })];
    const snapshot = input.map((c) => c.title);
    sortCards(input);
    expect(input.map((c) => c.title)).toEqual(snapshot);
  });
});

describe('computeStats', () => {
  it('counts statuses, priorities and overdue cards', () => {
    const cards = [
      card({ status: 'done' }),
      card({ status: 'doing', priority: 'urgent' }),
      card({ status: 'todo', priority: 'urgent', due: '2020-01-01T00:00:00.000Z' }),
    ];
    expect(computeStats(cards, NOW)).toEqual({
      total: 3,
      done: 1,
      doing: 1,
      todo: 1,
      overdue: 1,
      byPriority: { low: 0, normal: 1, high: 0, urgent: 2 },
    });
  });

  it('handles an empty board', () => {
    expect(computeStats([], NOW)).toMatchObject({ total: 0, done: 0, byPriority: { low: 0 } });
  });
});

describe('allTags', () => {
  it('returns a sorted unique set', () => {
    const cards = [card({ tags: ['work', 'home'] }), card({ tags: ['work', 'urgent'] })];
    expect(allTags(cards)).toEqual(['home', 'urgent', 'work']);
  });
});
