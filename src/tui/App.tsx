import { Box, Text, useApp, useInput } from 'ink';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Card } from '../core/card.js';
import { STATUSES, type Status } from '../core/card.js';
import { allTags, computeStats, filterCards, sortCards, type CardFilter } from '../core/selectors.js';
import { pluralize } from '../core/format.js';
import { ApiError, CardsClient } from './client.js';
import { CardView } from './CardView.js';
import { CardLayout, colors, GRID_COLUMNS, keyHint, paint, banner } from './theme.js';

const COLUMNS = GRID_COLUMNS;

export interface AppProps {
  client: CardsClient;
  layout?: CardLayout;
}

export function App({ client, layout = CardLayout.GRID }: AppProps) {
  const columns = layout === CardLayout.GRID ? COLUMNS : 1;
  const { exit } = useApp();
  const [cards, setCards] = useState<Card[]>([]);
  const [cursor, setCursor] = useState(0);
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const now = useMemo(() => new Date(), [cards.length]);

  const refresh = useCallback(async () => {
    try {
      setCards(await client.list());
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'failed to load cards');
    } finally {
      setLoaded(true);
    }
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filter: CardFilter = useMemo(
    () => ({
      ...(statusFilter === 'all' ? {} : { status: statusFilter }),
      ...(tagFilter === null ? {} : { tag: tagFilter }),
    }),
    [statusFilter, tagFilter],
  );

  const visible = useMemo(() => sortCards(filterCards(cards, filter, now)), [cards, filter, now]);
  const stats = useMemo(() => computeStats(cards, now), [cards, now]);
  const tags = useMemo(() => allTags(cards), [cards]);
  const active = visible[cursor];

  const act = useCallback(
    async (fn: () => Promise<unknown>) => {
      try {
        await fn();
        await refresh();
      } catch (cause) {
        setError(cause instanceof ApiError ? `API ${cause.status}` : 'request failed');
      }
    },
    [refresh],
  );

  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) {
      exit();
      return;
    }
    if (input === 'r') {
      void refresh();
      return;
    }
    if (input === 'j' || key.downArrow) {
      setCursor((c) => Math.min(c + 1, visible.length - 1));
      return;
    }
    if (input === 'k' || key.upArrow) {
      setCursor((c) => Math.max(c - 1, 0));
      return;
    }
    if (input === ' ') {
      if (active) void act(() => client.toggle(active.id));
      return;
    }
    if (input === 'd') {
      if (active) void act(() => client.remove(active.id));
      return;
    }
    if (input === 'n') {
      void act(() => client.add(`Card ${new Date().toLocaleTimeString()}`));
      return;
    }
    if (input === 'f') {
      const index = statusFilter === 'all' ? 0 : STATUSES.indexOf(statusFilter) + 1;
      const next = index >= STATUSES.length ? 'all' : STATUSES[index];
      setStatusFilter(next as Status | 'all');
      setCursor(0);
      return;
    }
    if (input === 't') {
      setTagFilter((current) => {
        if (tags.length === 0) return null;
        if (current === null) return tags[0] ?? null;
        const index = tags.indexOf(current);
        return index + 1 >= tags.length ? null : (tags[index + 1] ?? null);
      });
      setCursor(0);
    }
  });

  if (!loaded) {
    return <Text color={colors.muted}>Loading cards…</Text>;
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text>{banner}</Text>
        <Text dimColor>
          {'  '}
          {pluralize(stats.total, 'card')} · {stats.todo} todo · {stats.doing} doing ·{' '}
          {stats.done} done
          {stats.overdue > 0 ? paint.danger(` · ${stats.overdue} overdue`) : ''}
        </Text>
      </Box>

      <Box>
        <Text color={statusFilter === 'all' ? colors.highlight : colors.muted}>
          status: {statusFilter}
        </Text>
        <Text dimColor>{'  '}tag: {tagFilter ?? 'all'}</Text>
      </Box>

      {error !== null ? (
        <Box marginTop={1}>
          <Text color={colors.danger}>{error}</Text>
        </Box>
      ) : null}

      <Box flexDirection="column" marginTop={1}>
        {visible.length === 0 ? (
          <Text dimColor>  no cards match — press n to add one</Text>
        ) : (
          chunk(visible, columns).map((row, rowIndex) => (
            <Box key={rowIndex} gap={1}>
              {row.map((card) => {
                const index = visible.indexOf(card);
                return (
                  <CardView
                    key={card.id}
                    card={card}
                    selected={index === cursor}
                    now={now}
                  />
                );
              })}
            </Box>
          ))
        )}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          {keyHint([
            ['↑↓', 'move'],
            ['space', 'toggle'],
            ['d', 'delete'],
            ['n', 'new'],
            ['f', 'filter'],
            ['t', 'tag'],
            ['r', 'reload'],
            ['q', 'quit'],
          ])}
        </Text>
      </Box>
    </Box>
  );
}

function chunk<T>(list: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) {
    out.push(list.slice(i, i + size) as T[]);
  }
  return out;
}
