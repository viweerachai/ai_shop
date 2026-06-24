import { ApprovedExampleRepo } from "./approvedExampleRepo.js";
import { ContentPlanRepo } from "./contentPlanRepo.js";
import { ErrorMemoryRepo } from "./errorMemoryRepo.js";
import { GoogleSheetsClient } from "./googleSheetsClient.js";
import { ProductAssetRepo } from "./productAssetRepo.js";
import { ProcessedProductRepo } from "./processedProductRepo.js";
import { PromotionPlanRepo } from "./promotionPlanRepo.js";
import { PromptRuleRepo } from "./promptRuleRepo.js";
import { RawProductRepo } from "./rawProductRepo.js";
import { SalesOrderRepo } from "./salesOrderRepo.js";
import { TrendSignalRepo } from "./trendSignalRepo.js";

export function createRepos(client = new GoogleSheetsClient()) {
  return {
    client,
    rawProducts: new RawProductRepo(client),
    processedProducts: new ProcessedProductRepo(client),
    productAssets: new ProductAssetRepo(client),
    contentPlans: new ContentPlanRepo(client),
    promptRules: new PromptRuleRepo(client),
    promotionPlans: new PromotionPlanRepo(client),
    salesOrders: new SalesOrderRepo(client),
    trendSignals: new TrendSignalRepo(client),
    errorMemory: new ErrorMemoryRepo(client),
    approvedExamples: new ApprovedExampleRepo(client)
  };
}

export type Repos = ReturnType<typeof createRepos>;
