import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCard, type Card } from '../src/core/card.js';
import { CardNotFoundError, CardStore } from '../src/core/store.js';

function seeded(): Card[] {
  return [
    createCard({ title: 'first' }),
    createCard({ title: 'second' }),
    createCard({ title: 'third', status: 'done' }),
  ];
}

describe('CardStore', () => {
  let store: CardStore;

  beforeEach(() => {
    store = new CardStore();
  });

  it('starts empty', () => {
    expect(store.size).toBe(0);
    expect(store.all()).toEqual([]);
  });

  it('prepends new cards', () => {
    store.add({ title: 'one' });
    store.add({ title: 'two' });
    expect(store.all().map((c) => c.title)).toEqual(['two', 'one']);
  });

  it('returns defensive copies', () => {
    store.add({ title: 'one' });
    const first = store.all();
    first[0]!.title = 'mutated';
    expect(store.all()[0]!.title).toBe('one');
  });

  it('finds by id and returns undefined otherwise', () => {
    const card = store.add({ title: 'one' });
    expect(store.find(card.id)?.title).toBe('one');
    expect(store.find('nope')).toBeUndefined();
  });

  it('updates in place', () => {
    const card = store.add({ title: 'one' });
    const updated = store.update(card.id, { title: 'renamed' });
    expect(updated.title).toBe('renamed');
    expect(store.size).toBe(1);
  });

  it('toggles status', () => {
    const card = store.add({ title: 'one' });
    expect(store.toggle(card.id).status).toBe('done');
    expect(store.toggle(card.id).status).toBe('todo');
  });

  it('removes a card', () => {
    const card = store.add({ title: 'one' });
    store.remove(card.id);
    expect(store.size).toBe(0);
  });

  it('throws CardNotFoundError for unknown ids', () => {
    expect(() => store.update('x', { title: 'y' })).toThrow(CardNotFoundError);
    expect(() => store.toggle('x')).toThrow(CardNotFoundError);
    expect(() => store.remove('x')).toThrow(CardNotFoundError);
  });

  it('clearCompleted removes only done cards and reports the count', () => {
    store.replaceAll(seeded());
    expect(store.clearCompleted()).toBe(1);
    expect(store.size).toBe(2);
    expect(store.all().every((c) => c.status !== 'done')).toBe(true);
  });

  it('does not emit change when clearCompleted removes nothing', () => {
    const listener = vi.fn();
    store.replaceAll([createCard({ title: 'a' }), createCard({ title: 'b' })]);
    store.on('change', listener);
    expect(store.clearCompleted()).toBe(0);
    expect(listener).not.toHaveBeenCalled();
  });

  it('emits change with the new snapshot on every mutation', () => {
    const listener = vi.fn();
    store.on('change', listener);
    const card = store.add({ title: 'one' });
    store.update(card.id, { title: 'two' });
    store.toggle(card.id);
    store.remove(card.id);
    expect(listener).toHaveBeenCalledTimes(4);
    expect(listener.mock.lastCall?.[0]).toEqual([]);
  });

  it('seeds from an initial list without aliasing it', () => {
    const initial = seeded();
    const copy = new CardStore(initial);
    initial.length = 0;
    expect(copy.size).toBe(3);
  });
});
