/**
 * Logger Utility - Pino-based structured logging
 */

import pino from 'pino';
import { getConfig } from '@collaborative-ide/shared-types/config';

const config = getConfig();

export const logger = pino({
  level: config.NODE_ENV === 'development' ? 'debug' : 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: 'api-node',
    environment: config.NODE_ENV,
  },
});

// Child logger factory for routes/services
export function createChildLogger(context: Record<string, unknown>) {
  return logger.child(context);
}