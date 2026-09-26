import kleur from 'kleur';
import type { CardAccent } from '../core/format.js';

export const colors = {
  accent: 'cyan',
  title: 'white',
  muted: 'gray',
  ok: 'green',
  warn: 'yellow',
  danger: 'red',
  highlight: 'magenta',
} as const satisfies Record<string, CardAccent | 'white' | 'gray'>;

export type ColorName = (typeof colors)[keyof typeof colors];

/** Layouts the TUI can render. Only GRID is implemented so far. */
export enum CardLayout {
  GRID = 'grid',
  LIST = 'list',
  BOARD = 'board',
}

export const GRID_COLUMNS = 2;

export const paint = {
  accent: (text: string): string => kleur.cyan().bold(text),
  dim: (text: string): string => kleur.gray(text),
  danger: (text: string): string => kleur.red(text),
  highlight: (text: string): string => kleur.magenta(text),
  key: (text: string): string => kleur.cyan(text),
} as const;

export const banner = paint.accent(' CARDS ');

export function keyHint(keys: ReadonlyArray<readonly [string, string]>): string {
  return keys
    .map(([key, action]) => `${paint.key(key)} ${paint.dim(action)}`)
    .join(paint.dim(' · '));
}
