import * as Sentry from "@sentry/node";
import { env } from "../config/env.js";

/**
 * No-op unless SENTRY_DSN is configured — safe to call in every environment,
 * including local dev and CI, without needing a Sentry account.
 */
export const initSentry = (): void => {
  if (!env.SENTRY_DSN) return;

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    // Manual error capture only (errorHandler middleware + process-level
    // crash handlers) — no request tracing/performance monitoring enabled,
    // keep it cheap by default.
    tracesSampleRate: 0,
  });
};

export { Sentry };
