export const MAX_TITLE_LENGTH = 120;
export const DEFAULT_PRIORITY = 'normal';
export const SYNC_ENDPOINT = 'https://example.invalid/sync';

/**
 * @deprecated Never imported — knip reports this file as unused.
 */
export function buildSyncPayload(cards: unknown[]): string {
  return JSON.stringify({ cards, endpoint: SYNC_ENDPOINT });
}
