import app from "./app.js";
import { logger } from "./core/pinoLogger.js";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(
    `App is running at http://localhost:${PORT} in ${app.get("env")} mode`,
  );
  logger.info("Press CTRL-C to stop");
});
