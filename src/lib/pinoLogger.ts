import pino from "pino";
import { pinoHttp } from "pino-http";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  // Log level: capture everything down to debug locally, only info/errors in production
  level: isProduction ? "info" : "debug",

  // Format timestamps as readable ISO strings
  timestamp: pino.stdTimeFunctions.isoTime,

  // Redact sensitive fields so they never accidentally print to log files
  redact: {
    paths: ["req.headers.authorization", "req.body.password"],
    censor: "[REDACTED]",
  },

  // Use pino-pretty for clean, colored terminal output during local development
  transport: !isProduction
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname,req.headers", // Cleans up unnecessary terminal clutter
        },
      }
    : undefined,
});
const pinoConfig = pinoHttp({
  logger, // Uses your custom config from logger.js
  autoLogging: {
    // Intercepts the request object before generating a log
    ignore: (req) => {
      const url = typeof req.url === "string" ? req.url : "";

      // 1. Hide all Swagger documentation routes
      if (url.startsWith("/api-docs")) return true;

      // 2. Hide common web assets (optional)
      if (url === "/favicon.ico") return true;

      // 3. Hide a health check endpoint if you have one (optional)
      if (url === "/health") return true;

      return false; // Log everything else normally
    },
  },
  // Automatically generates a unique tracking ID for every incoming request
  genReqId: (req) => req.headers["x-request-id"] || crypto.randomUUID(),

  // Optional: Customise what gets logged out for requests
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
});
export default pinoConfig;
