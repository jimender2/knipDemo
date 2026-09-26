import type { Card, Priority, Status } from './card.js';

export interface CardFilter {
  status?: Status;
  priority?: Priority;
  tag?: string;
  search?: string;
  overdueOnly?: boolean;
}

export interface CardStats {
  total: number;
  done: number;
  todo: number;
  doing: number;
  overdue: number;
  byPriority: Record<Priority, number>;
}

const PRIORITY_WEIGHT: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export function isOverdue(card: Card, now: Date = new Date()): boolean {
  if (card.status === 'done' || card.due === null) return false;
  return new Date(card.due).getTime() < now.getTime();
}

export function filterCards(cards: readonly Card[], filter: CardFilter, now?: Date): Card[] {
  return cards.filter((card) => {
    if (filter.status !== undefined && card.status !== filter.status) return false;
    if (filter.priority !== undefined && card.priority !== filter.priority) return false;
    if (filter.tag !== undefined && !card.tags.includes(filter.tag)) return false;
    if (filter.overdueOnly === true && !isOverdue(card, now)) return false;
    if (filter.search !== undefined && filter.search.trim() !== '') {
      return matchesSearch(card, filter.search);
    }
    return true;
  });
}

export function sortCards(cards: readonly Card[]): Card[] {
  return [...cards].sort((a, b) => {
    if (a.status === 'done' && b.status !== 'done') return 1;
    if (b.status === 'done' && a.status !== 'done') return -1;

    const byPriority = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    if (byPriority !== 0) return byPriority;

    const aDue = a.due === null ? Number.POSITIVE_INFINITY : new Date(a.due).getTime();
    const bDue = b.due === null ? Number.POSITIVE_INFINITY : new Date(b.due).getTime();
    if (aDue !== bDue) return aDue - bDue;

    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function computeStats(cards: readonly Card[], now: Date = new Date()): CardStats {
  const byPriority: Record<Priority, number> = { low: 0, normal: 0, high: 0, urgent: 0 };
  let done = 0;
  let doing = 0;
  let todo = 0;
  let overdue = 0;

  for (const card of cards) {
    byPriority[card.priority] += 1;
    if (card.status === 'done') done += 1;
    else if (card.status === 'doing') doing += 1;
    else todo += 1;
    if (isOverdue(card, now)) overdue += 1;
  }

  return { total: cards.length, done, todo, doing, overdue, byPriority };
}

export function allTags(cards: readonly Card[]): string[] {
  const tags = new Set<string>();
  for (const card of cards) {
    for (const tag of card.tags) tags.add(tag);
  }
  return [...tags].sort();
}

function matchesSearch(card: Card, search: string): boolean {
  const needle = search.trim().toLowerCase();
  return (
    card.title.toLowerCase().includes(needle) ||
    card.notes.toLowerCase().includes(needle) ||
    card.tags.some((tag) => tag.toLowerCase().includes(needle))
  );
}
