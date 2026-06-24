import cron, { ScheduledTask } from "node-cron";
import { config } from "./config.js";
import { logger } from "./utils/logger.js";
import { runNamedWorkflow } from "./runtime/workflowRunner.js";

let task: ScheduledTask | undefined;

export function startScheduler(): ScheduledTask {
  const [hour, minute] = config.dailyAutoRunTime.split(":").map(Number);
  const expression = `${minute ?? 0} ${hour ?? 9} * * *`;
  task = cron.schedule(expression, async () => {
    try {
      logger.info({ expression, timezone: config.timezone }, "Scheduled auto run started");
      await runNamedWorkflow("auto:once");
    } catch (error) {
      logger.error({ error }, "Scheduled auto run failed");
    }
  }, { timezone: config.timezone });
  logger.info({ expression, timezone: config.timezone }, "Scheduler is active");
  return task;
}

export function stopScheduler(): void {
  task?.stop();
}
