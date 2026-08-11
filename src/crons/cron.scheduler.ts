import cron from "node-cron";
import { logger } from "../lib/pinoLogger.js";
import { sendReminderEmail } from "./cron.tasks.js";
const initCronJobs = () => {
//   logger.info("Initializing rental reminder cron job (every 10 minutes)");
  cron.schedule("*/10 * * * *", async () => {
    // logger.debug("Reminder cron trigger fired");
    await sendReminderEmail();
  });
};
export default initCronJobs