const pino = require('pino');
const config = require('../config');

const logger = pino({
  level: config.env === 'production' ? 'info' : 'debug',
  transport:
    config.env !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

module.exports = logger;
