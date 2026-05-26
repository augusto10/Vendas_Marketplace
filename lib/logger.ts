export type LogContext = Record<string, unknown>;

export const logger = {
  info(message: string, context?: LogContext) {
    console.info(JSON.stringify({ level: "info", message, context, timestamp: new Date().toISOString() }));
  },
  warn(message: string, context?: LogContext) {
    console.warn(JSON.stringify({ level: "warn", message, context, timestamp: new Date().toISOString() }));
  },
  error(message: string, context?: LogContext) {
    console.error(JSON.stringify({ level: "error", message, context, timestamp: new Date().toISOString() }));
  }
};
