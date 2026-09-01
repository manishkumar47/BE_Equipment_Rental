import { initSentry, Sentry } from "./core/sentry.js";

initSentry();

import app from "./app.js";
import { logger } from "./core/pinoLogger.js";

const PORT = process.env.PORT || 3000;

// Crashes here happen outside any Express request context (unrelated to the
// errorHandler middleware), so without this they'd be invisible unless
// someone was tailing logs at the moment it happened.
process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection");
  Sentry.captureException(reason);
});

process.on("uncaughtException", (error) => {
  logger.error({ err: error }, "Uncaught exception");
  Sentry.captureException(error);
});

app.listen(PORT, () => {
  logger.info(
    `App is running at http://localhost:${PORT} in ${app.get("env")} mode`,
  );
  logger.info("Press CTRL-C to stop");
});
