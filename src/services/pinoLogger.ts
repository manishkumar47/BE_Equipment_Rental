import pino from "pino";
import { pinoHttp } from "pino-http";
import crypto from "node:crypto";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: isProduction ? "info" : "debug",

  timestamp: pino.stdTimeFunctions.isoTime,

  redact: {
    paths: ["req.headers.authorization", "req.body.password"],
    censor: "[REDACTED]",
  },

  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname,req.headers",
          },
        },
      }),
});

const pinoConfig = pinoHttp({
  logger,

  autoLogging: {
    ignore: (req) => {
      const url = typeof req.url === "string" ? req.url : "";

      if (url.startsWith("/api-docs")) return true;
      if (url === "/favicon.ico") return true;
      if (url === "/health") return true;

      return false;
    },
  },

  genReqId: (req) => req.headers["x-request-id"] || crypto.randomUUID(),

  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return "error";
    if (res.statusCode >= 400) return "warn";

    return "info";
  },
});

export default pinoConfig;
