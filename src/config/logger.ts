import { APP_CONFIG } from "@/config/app.config";
import Sentry from "@sentry/node";
import { createLogger, format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import Transport from "winston-transport";

const { colorize, timestamp, printf, combine, align, errors, json } = format;
const IS_PRODUCTION = APP_CONFIG.NODE_ENV === "production";
const SentryWinstonTransport = Sentry.createSentryWinstonTransport(Transport, {
  // Only capture error and warn logs
  levels: ["error", "warn"],
});
// -----------------------------
// Transports
// -----------------------------
const transportsArray: (
  | typeof transports.Console
  | DailyRotateFile
  | Transport
)[] = [];

if (!IS_PRODUCTION) {
  transportsArray.push(
    new transports.Console({
      format: combine(
        colorize({ all: true }),
        timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        align(),
        printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length
            ? `\n${JSON.stringify(meta, null, 2)}`
            : "";
          return `${timestamp} [${level.toUpperCase()}]: ${message}${metaStr}`;
        })
      ),
    })
  );
}

transportsArray.push(
  new DailyRotateFile({
    dirname: "logs",
    filename: "%DATE%-app.log",
    datePattern: "YYYY-MM-DD",
    maxSize: "20m",
    maxFiles: "14d",
  }),
  new SentryWinstonTransport()
);

// -----------------------------
// Log Format (production uses JSON)
// -----------------------------
const logFormat = combine(
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  errors({ stack: true }),
  json(),
  printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
  })
);

// -----------------------------
// Winston Logger Instance
// -----------------------------
export const logger = createLogger({
  level: IS_PRODUCTION ? "info" : "debug",
  format: logFormat,
  transports: transportsArray,
});
