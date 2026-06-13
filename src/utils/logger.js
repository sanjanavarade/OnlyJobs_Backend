const { createLogger, format, transports } = require('winston');

const isProd = process.env.NODE_ENV === 'production';

const devFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: 'HH:mm:ss' }),
  format.errors({ stack: true }),
  format.printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
    return `${timestamp} ${level}: ${message}${stack ? '\n' + stack : ''}${metaStr}`;
  })
);

const prodFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.json()
);

const logger = createLogger({
  level: isProd ? 'warn' : 'http',
  format: isProd ? prodFormat : devFormat,
  transports: [new transports.Console()],
});

module.exports = logger;
