import type { Card, Priority } from './card.js';
import { isOverdue } from './selectors.js';

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
];

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function formatDue(iso: string | null, now: Date = new Date()): string {
  if (iso === null) return '—';
  const delta = new Date(iso).getTime() - now.getTime();
  for (const [unit, ms] of UNITS) {
    if (Math.abs(delta) >= ms) {
      return rtf.format(Math.round(delta / ms), unit);
    }
  }
  return 'now';
}

export function priorityGlyph(priority: Priority): string {
  switch (priority) {
    case 'urgent':
      return '!!!';
    case 'high':
      return '!! ';
    case 'normal':
      return '!  ';
    case 'low':
      return '   ';
  }
}

export type CardAccent = 'red' | 'green' | 'magenta' | 'yellow' | 'cyan';

export function cardAccent(card: Card, now: Date = new Date()): CardAccent {
  if (card.status === 'done') return 'green';
  if (isOverdue(card, now)) return 'red';
  if (card.priority === 'urgent') return 'magenta';
  if (card.priority === 'high') return 'yellow';
  return 'cyan';
}

export function truncate(text: string, width: number): string {
  if (text.length <= width) return text;
  if (width <= 1) return text.slice(0, Math.max(width, 0));
  return `${text.slice(0, width - 1)}…`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
