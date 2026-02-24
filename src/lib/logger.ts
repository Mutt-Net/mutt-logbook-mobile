/**
 * Logger utility for mutt-logbook-mobile
 * 
 * Provides a centralized logging service that can be:
 * - Disabled in production builds
 * - Extended with remote logging/crash reporting
 * - Consistent across the application
 */

// Log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// Configuration
const ENABLE_LOGS = __DEV__; // Only log in development
const MIN_LOG_LEVEL = __DEV__ ? LogLevel.DEBUG : LogLevel.WARN;

interface Logger {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
}

/**
 * Create a logger instance with optional prefix
 */
function createLogger(prefix?: string): Logger {
  const formatMessage = (level: string, message: string): string => {
    const timestamp = new Date().toISOString();
    const prefixStr = prefix ? `[${prefix}] ` : '';
    return `[${timestamp}] ${level} ${prefixStr}${message}`;
  };

  return {
    debug: (message: string, ...args: any[]) => {
      if (ENABLE_LOGS && LogLevel.DEBUG >= MIN_LOG_LEVEL) {
        console.debug(formatMessage('DEBUG', message), ...args);
      }
    },
    info: (message: string, ...args: any[]) => {
      if (ENABLE_LOGS && LogLevel.INFO >= MIN_LOG_LEVEL) {
        console.info(formatMessage('INFO', message), ...args);
      }
    },
    warn: (message: string, ...args: any[]) => {
      if (ENABLE_LOGS && LogLevel.WARN >= MIN_LOG_LEVEL) {
        console.warn(formatMessage('WARN', message), ...args);
      }
    },
    error: (message: string, ...args: any[]) => {
      if (LogLevel.ERROR >= MIN_LOG_LEVEL) {
        console.error(formatMessage('ERROR', message), ...args);
      }
    },
  };
}

// Default logger instance
export const logger = createLogger();

// Export factory for creating prefixed loggers
export { createLogger };
