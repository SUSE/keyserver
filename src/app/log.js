const config = require('config');
const winston = require('winston');

const log = winston.createLogger({
  level: config.log.level,
  format: winston.format.combine(
    winston.format.splat(),
    winston.format.simple(),
    winston.format.colorize(),
    winston.format.timestamp(),
    winston.format.align(),
    winston.format.printf(msg => `${msg.timestamp} ${msg.level}:${msg.message}`),
  ),
  transports: [
  new (winston.transports.Console)({ level: config.log.level })
]
});

module.exports = log;

log.debug('Logger initialized.');
