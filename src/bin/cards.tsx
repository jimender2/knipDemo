import { render } from 'ink';
import { App } from '../tui/App.js';
import { CardsClient } from '../tui/client.js';
import { log } from '../util/logger.js';

const baseUrl = process.env['CARDS_API_URL'] ?? 'http://127.0.0.1:4310';

log.info(`connecting to ${baseUrl}`);

const instance = render(<App client={new CardsClient(baseUrl)} />);

instance.waitUntilExit().then(
  () => process.exit(0),
  (error: unknown) => {
    log.error('tui crashed', error);
    process.exit(1);
  },
);
