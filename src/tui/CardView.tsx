import { Box, Text } from 'ink';
import type { Card } from '../core/card.js';
import { cardAccent, formatDue, priorityGlyph, truncate } from '../core/format.js';
import { isOverdue } from '../core/selectors.js';
import { colors, paint, type ColorName } from './theme.js';

const WIDTH = 44;
const TITLE_WIDTH = WIDTH - 6;

export interface CardViewProps {
  card: Card;
  selected: boolean;
  now: Date;
}

export function CardView({ card, selected, now }: CardViewProps) {
  const accent: ColorName = cardAccent(card, now);
  const overdue = isOverdue(card, now);
  const due = card.due === null ? '' : formatDue(card.due, now);
  const note = card.notes !== '' ? card.notes : card.status === 'done' ? 'completed' : '';

  return (
    <Box
      flexDirection="column"
      borderStyle={selected ? 'round' : 'single'}
      borderColor={selected ? accent : colors.muted}
      width={WIDTH}
      paddingX={1}
    >
      <Box>
        <Text color={selected ? accent : colors.title} bold={selected}>
          {selected ? '❯ ' : '  '}
          {truncate(card.title, TITLE_WIDTH)}
        </Text>
      </Box>

      <Box gap={1}>
        <Text color={card.priority === 'urgent' ? colors.highlight : colors.muted}>
          {priorityGlyph(card.priority)}
        </Text>
        <Text color={colors.muted}>
          {card.status.padEnd(5)}
          {due !== '' ? ` · ${overdue ? paint.danger(due) : due}` : ''}
        </Text>
      </Box>

      {card.tags.length > 0 ? (
        <Box gap={1} flexWrap="wrap">
          {card.tags.map((tag) => (
            <Text key={tag} color={selected ? accent : colors.muted}>
              #{tag}
            </Text>
          ))}
        </Box>
      ) : null}

      {note !== '' ? (
        <Box>
          <Text color={colors.muted} strikethrough={card.status === 'done'}>
            {truncate(note, TITLE_WIDTH)}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
}

export type { ColorName };
