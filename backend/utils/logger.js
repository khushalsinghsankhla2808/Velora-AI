import winston from "winston";

/**
 * Winston logger configured for production-grade logging.
 * In development (NODE_ENV !== 'production'), it will output colorized simplified logs.
 * In production/other modes, it will output JSON formatted logs.
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV !== "production"
        ? winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        : winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
    }),
  ],
});

export default logger;
