import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

const pinoLogger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }),
});

// Wrapper that accepts console.error-style args: logger.error('msg', data)
const logger = {
  error(msg: unknown, ...args: unknown[]) {
    if (typeof msg === 'string' && args.length > 0) {
      pinoLogger.error({ data: args.length === 1 ? args[0] : args }, msg);
    } else if (typeof msg === 'object' && msg !== null) {
      pinoLogger.error(msg as Record<string, unknown>, args[0] as string);
    } else {
      pinoLogger.error(String(msg));
    }
  },
  warn(msg: unknown, ...args: unknown[]) {
    if (typeof msg === 'string' && args.length > 0) {
      pinoLogger.warn({ data: args.length === 1 ? args[0] : args }, msg);
    } else {
      pinoLogger.warn(String(msg));
    }
  },
  info(msg: unknown, ...args: unknown[]) {
    if (typeof msg === 'string' && args.length > 0) {
      pinoLogger.info({ data: args.length === 1 ? args[0] : args }, msg);
    } else {
      pinoLogger.info(String(msg));
    }
  },
  debug(msg: unknown, ...args: unknown[]) {
    if (typeof msg === 'string' && args.length > 0) {
      pinoLogger.debug({ data: args.length === 1 ? args[0] : args }, msg);
    } else {
      pinoLogger.debug(String(msg));
    }
  },
  child: pinoLogger.child.bind(pinoLogger),
};

export default logger;
