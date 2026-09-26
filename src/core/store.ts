import { EventEmitter } from 'node:events';
import {
  applyUpdate,
  createCard,
  toggleCard,
  type Card,
  type CardDraft,
} from './card.js';

export class CardNotFoundError extends Error {
  constructor(readonly id: string) {
    super(`No card with id "${id}"`);
    this.name = 'CardNotFoundError';
  }
}

export type StoreEvent = 'change';

export class CardStore extends EventEmitter {
  #cards: Card[] = [];

  constructor(initial: readonly Card[] = []) {
    super();
    this.#cards = [...initial];
  }

  get size(): number {
    return this.#cards.length;
  }

  all(): Card[] {
    return this.#cards.map((card) => ({ ...card }));
  }

  find(id: string): Card | undefined {
    const card = this.#cards.find((candidate) => candidate.id === id);
    return card ? { ...card } : undefined;
  }

  add(draft: CardDraft = {}): Card {
    const card = createCard(draft);
    this.#cards = [card, ...this.#cards];
    this.#commit();
    return { ...card };
  }

  update(id: string, patch: Partial<CardDraft>): Card {
    const index = this.#indexOf(id);
    const updated = applyUpdate(this.#cards[index]!, patch);
    this.#cards = replaceAt(this.#cards, index, updated);
    this.#commit();
    return { ...updated };
  }

  toggle(id: string): Card {
    const index = this.#indexOf(id);
    const updated = toggleCard(this.#cards[index]!);
    this.#cards = replaceAt(this.#cards, index, updated);
    this.#commit();
    return { ...updated };
  }

  remove(id: string): void {
    const index = this.#indexOf(id);
    this.#cards = [...this.#cards.slice(0, index), ...this.#cards.slice(index + 1)];
    this.#commit();
  }

  clearCompleted(): number {
    const before = this.#cards.length;
    this.#cards = this.#cards.filter((card) => card.status !== 'done');
    const removed = before - this.#cards.length;
    if (removed > 0) this.#commit();
    return removed;
  }

  replaceAll(cards: readonly Card[]): void {
    this.#cards = [...cards];
    this.#commit();
  }

  #indexOf(id: string): number {
    const index = this.#cards.findIndex((candidate) => candidate.id === id);
    if (index === -1) throw new CardNotFoundError(id);
    return index;
  }

  #commit(): void {
    this.emit('change', this.all());
  }
}

function replaceAt<T>(list: readonly T[], index: number, value: T): T[] {
  return [...list.slice(0, index), value, ...list.slice(index + 1)];
}
