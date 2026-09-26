type Level = 'debug' | 'info' | 'warn' | 'error';

const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const threshold: number = ORDER[(process.env.LOG_LEVEL as Level) ?? 'info'] ?? ORDER.info;

function emit(level: Level, message: string, ...rest: unknown[]): void {
  if (ORDER[level] < threshold) return;
  const stamp = new Date().toISOString().slice(11, 19);
  const line = `${stamp} ${level.toUpperCase().padEnd(5)} ${message}`;
  if (level === 'error' || level === 'warn') console.error(line, ...rest);
  else console.log(line, ...rest);
}

export const log = {
  debug: (message: string, ...rest: unknown[]) => emit('debug', message, ...rest),
  info: (message: string, ...rest: unknown[]) => emit('info', message, ...rest),
  warn: (message: string, ...rest: unknown[]) => emit('warn', message, ...rest),
  error: (message: string, ...rest: unknown[]) => emit('error', message, ...rest),
};
