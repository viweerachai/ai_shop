import { config } from "./config.js";
import { createRepos } from "./sheets/repos.js";
import { importBigSellerSkuExcel, importSalesOrdersCsv, importStockCsv } from "./services/dataImportService.js";
import { logger } from "./utils/logger.js";
import { createWorkflowContext } from "./workflows/context.js";
import { contentQaWorkflow } from "./workflows/contentQaWorkflow.js";
import { contentWriteWorkflow } from "./workflows/contentWriteWorkflow.js";
import { dailyCeoReviewWorkflow } from "./workflows/dailyCeoReviewWorkflow.js";
import { imageGenerateWorkflow } from "./workflows/imageGenerateWorkflow.js";
import { imagePlanWorkflow } from "./workflows/imagePlanWorkflow.js";
import { marketingCampaignWorkflow } from "./workflows/marketingCampaignWorkflow.js";
import { newArrivalWorkflow } from "./workflows/newArrivalWorkflow.js";
import { productIntakeWorkflow } from "./workflows/productIntakeWorkflow.js";
import { productQaWorkflow } from "./workflows/productQaWorkflow.js";
import { productWriteWorkflow } from "./workflows/productWriteWorkflow.js";
import { promotionSuggestionWorkflow } from "./workflows/promotionSuggestionWorkflow.js";
import { reportWorkflow } from "./workflows/reportWorkflow.js";
import { weeklyContentWorkflow } from "./workflows/weeklyContentWorkflow.js";
import { managerFinalCheckWorkflow } from "./workflows/managerFinalCheckWorkflow.js";
import { assertWorkflowDependencies, runAutoSequence } from "./runtime/workflowRunner.js";
import { startScheduler } from "./scheduler.js";

const command = process.argv[2] ?? "help";
const dryRun = config.dryRun || process.argv.includes("--dry-run");

const commands = [
  "sheets:init",
  "product:intake",
  "product:write",
  "product:qa",
  "ceo:daily",
  "marketing:campaign",
  "content:new-arrival",
  "content:plan",
  "content:write",
  "content:qa",
  "image:plan",
  "image:generate",
  "promo:suggest",
  "manager:final-check",
  "auto:once",
  "scheduler:start",
  "report:daily",
  "run:all",
  "product:import",
  "sales:import",
  "stock:import"
];

async function main(): Promise<void> {
  if (command === "help" || !commands.includes(command)) {
    console.log(`Usage: npm run <command>\n\nCommands:\n${commands.map((item) => `  ${item}`).join("\n")}`);
    if (command !== "help") process.exitCode = 1;
    return;
  }
  if (dryRun) {
    console.log(JSON.stringify({
      ok: true,
      dryRun: true,
      command,
      message: "Configuration path is valid. No Gemini or Google API call was made."
    }, null, 2));
    return;
  }

  switch (command) {
    case "sheets:init":
      await createRepos().client.ensureSheets();
      break;
    case "product:intake":
      assertWorkflowDependencies("product:intake");
      console.log(await productIntakeWorkflow(createWorkflowContext()));
      break;
    case "product:write":
      assertWorkflowDependencies("product:write");
      console.log(await productWriteWorkflow(createWorkflowContext()));
      break;
    case "product:qa":
      assertWorkflowDependencies("product:qa");
      console.log(await productQaWorkflow(createWorkflowContext()));
      break;
    case "ceo:daily":
      assertWorkflowDependencies("ceo:daily");
      console.log(JSON.stringify(await dailyCeoReviewWorkflow(createWorkflowContext()), null, 2));
      break;
    case "marketing:campaign":
      assertWorkflowDependencies("marketing:campaign");
      console.log(JSON.stringify(await marketingCampaignWorkflow(createWorkflowContext()), null, 2));
      break;
    case "content:new-arrival":
      assertWorkflowDependencies("content:new-arrival");
      console.log(await newArrivalWorkflow(createWorkflowContext()));
      break;
    case "content:plan":
      assertWorkflowDependencies("content:plan");
      console.log(await weeklyContentWorkflow(createWorkflowContext()));
      break;
    case "content:write":
      assertWorkflowDependencies("content:write");
      console.log(await contentWriteWorkflow(createWorkflowContext()));
      break;
    case "content:qa":
      assertWorkflowDependencies("content:qa");
      console.log(await contentQaWorkflow(createWorkflowContext()));
      break;
    case "image:plan":
      assertWorkflowDependencies("image:plan");
      console.log(await imagePlanWorkflow(createWorkflowContext()));
      break;
    case "image:generate":
      assertWorkflowDependencies("image:generate");
      console.log(await imageGenerateWorkflow(createWorkflowContext()));
      break;
    case "promo:suggest":
      assertWorkflowDependencies("promo:suggest");
      console.log(await promotionSuggestionWorkflow(createWorkflowContext()));
      break;
    case "manager:final-check":
      assertWorkflowDependencies("manager:final-check");
      console.log(await managerFinalCheckWorkflow(createWorkflowContext()));
      break;
    case "auto:once":
      assertWorkflowDependencies("auto:once");
      console.log(await runAutoSequence());
      break;
    case "scheduler:start":
      assertWorkflowDependencies("auto:once");
      startScheduler();
      console.log("Scheduler started. Press Ctrl+C to stop.");
      await new Promise(() => undefined);
      break;
    case "report:daily":
      assertWorkflowDependencies("report:daily");
      console.log(await reportWorkflow(createWorkflowContext()));
      break;
    case "run:all": {
      assertWorkflowDependencies("auto:once");
      const context = createWorkflowContext();
      await productIntakeWorkflow(context);
      await productWriteWorkflow(context);
      await productQaWorkflow(context);
      await newArrivalWorkflow(context);
      await weeklyContentWorkflow(context);
      await contentWriteWorkflow(context);
      await contentQaWorkflow(context);
      await imagePlanWorkflow(context);
      await imageGenerateWorkflow(context);
      await managerFinalCheckWorkflow(context);
      await promotionSuggestionWorkflow(context);
      console.log(await reportWorkflow(context));
      break;
    }
    case "product:import": {
      if (!config.hasGoogleCredentials) {
        throw new Error("Google Sheets credentials are required for product import.");
      }
      const filePath = process.argv[3];
      if (!filePath) {
        throw new Error("Usage: npm run product:import -- /absolute/path/to/SKU_Merchant.xlsx");
      }
      console.log(await importBigSellerSkuExcel(filePath));
      break;
    }
    case "sales:import": {
      if (!config.hasGoogleCredentials) {
        throw new Error("Google Sheets credentials are required for sales import.");
      }
      const filePath = process.argv[3];
      if (!filePath) {
        throw new Error("Usage: npm run sales:import -- /absolute/path/to/sales.csv");
      }
      console.log(await importSalesOrdersCsv(filePath));
      break;
    }
    case "stock:import": {
      if (!config.hasGoogleCredentials) {
        throw new Error("Google Sheets credentials are required for stock import.");
      }
      const filePath = process.argv[3];
      if (!filePath) {
        throw new Error("Usage: npm run stock:import -- /absolute/path/to/stock.csv");
      }
      console.log(await importStockCsv(filePath));
      break;
    }
  }
}

main().catch((error) => {
  logger.error({ error, command }, "Command failed");
  process.exitCode = 1;
});
