import { describe, expect, it } from 'vitest';
import { createCard } from '../src/core/card.js';
import {
  cardAccent,
  formatDue,
  pluralize,
  priorityGlyph,
  truncate,
} from '../src/core/format.js';

const NOW = new Date('2026-06-15T12:00:00.000Z');

describe('formatDue', () => {
  it('renders a dash when there is no due date', () => {
    expect(formatDue(null, NOW)).toBe('—');
  });

  it('describes the future', () => {
    expect(formatDue('2026-06-16T12:00:00.000Z', NOW)).toBe('tomorrow');
  });

  it('describes the past', () => {
    expect(formatDue('2026-06-14T12:00:00.000Z', NOW)).toBe('yesterday');
  });

  it('falls back to hours and minutes', () => {
    expect(formatDue('2026-06-15T15:00:00.000Z', NOW)).toBe('in 3 hours');
    expect(formatDue('2026-06-15T12:30:00.000Z', NOW)).toBe('in 30 minutes');
  });

  it('reports "now" for sub-minute deltas', () => {
    expect(formatDue('2026-06-15T12:00:30.000Z', NOW)).toBe('now');
  });
});

describe('priorityGlyph', () => {
  it('maps priorities to exclamation marks', () => {
    expect(priorityGlyph('urgent')).toBe('!!!');
    expect(priorityGlyph('high')).toBe('!! ');
    expect(priorityGlyph('normal')).toBe('!  ');
    expect(priorityGlyph('low')).toBe('   ');
  });
});

describe('cardAccent', () => {
  const base = createCard({ title: 'x' });

  it('is green once done', () => {
    expect(cardAccent({ ...base, status: 'done' }, NOW)).toBe('green');
  });

  it('is red when overdue', () => {
    expect(cardAccent({ ...base, due: '2020-01-01T00:00:00.000Z' }, NOW)).toBe('red');
  });

  it('is magenta for urgent, yellow for high, cyan otherwise', () => {
    expect(cardAccent({ ...base, priority: 'urgent' }, NOW)).toBe('magenta');
    expect(cardAccent({ ...base, priority: 'high' }, NOW)).toBe('yellow');
    expect(cardAccent(base, NOW)).toBe('cyan');
  });
});

describe('truncate', () => {
  it('leaves short strings alone', () => {
    expect(truncate('short', 10)).toBe('short');
  });

  it('adds an ellipsis when cutting', () => {
    expect(truncate('a'.repeat(20), 5)).toBe('aaaa…');
  });

  it('handles degenerate widths', () => {
    expect(truncate('abc', 0)).toBe('');
    expect(truncate('abc', 1)).toBe('a');
  });
});

describe('pluralize', () => {
  it('uses the singular for one', () => {
    expect(pluralize(1, 'card')).toBe('1 card');
  });

  it('uses the plural otherwise', () => {
    expect(pluralize(0, 'card')).toBe('0 cards');
    expect(pluralize(2, 'card')).toBe('2 cards');
  });

  it('accepts an irregular plural', () => {
    expect(pluralize(2, 'entry', 'entries')).toBe('2 entries');
  });
});
