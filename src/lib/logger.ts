/**
 * Tiny logger that prefixes lines with a module tag and no-ops `debug`
 * unless `DEBUG` is set (or we're in development). Designed to replace
 * scattered `console.*` calls in server code without pulling in pino.
 */

import { env } from '@/lib/env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const debugEnabled = !!env.DEBUG || env.isDevelopment;

function fmt(level: LogLevel, mod: string, args: unknown[]): unknown[] {
  return [`[${mod}]`, ...args];
}

export function createLogger(module: string) {
  return {
    debug: (...args: unknown[]) => {
      if (debugEnabled) console.log(...fmt('debug', module, args));
    },
    info: (...args: unknown[]) => {
      console.log(...fmt('info', module, args));
    },
    warn: (...args: unknown[]) => {
      console.warn(...fmt('warn', module, args));
    },
    error: (...args: unknown[]) => {
      console.error(...fmt('error', module, args));
    },
  };
}

export type Logger = ReturnType<typeof createLogger>;
