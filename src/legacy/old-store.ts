import type { Card } from '../core/card.js';

/**
 * @deprecated Superseded by CardStore. Kept only to give knip something
 * to flag under "unused files".
 */
export class LegacyStore {
  private cards: Card[] = [];

  add(card: Card): void {
    this.cards.push(card);
  }

  get all(): Card[] {
    return this.cards;
  }

  clear(): void {
    this.cards = [];
  }
}
