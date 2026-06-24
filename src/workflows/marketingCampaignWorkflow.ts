import { createSalesAnalytics } from "../business/salesAnalytics.js";
import { createMarketingCampaign } from "../agents/marketingAgent.js";
import { CeoStrategy } from "../types/agent.js";
import { dailyCeoReviewWorkflow } from "./dailyCeoReviewWorkflow.js";
import { WorkflowContext } from "./context.js";

export async function marketingCampaignWorkflow(
  context: WorkflowContext,
  strategy?: CeoStrategy
) {
  const [products, salesOrders, trendSignals] = await Promise.all([
    context.repos.processedProducts.all(),
    context.repos.salesOrders.all(),
    context.repos.trendSignals.active()
  ]);
  const ceoStrategy = strategy ?? await dailyCeoReviewWorkflow(context);
  const salesSummary = createSalesAnalytics(salesOrders);
  return createMarketingCampaign(context.repos, context.gemini, {
    strategy: ceoStrategy,
    products,
    salesOrders,
    salesSummary: {
      totalOrders30d: salesSummary.totalOrders30d,
      totalUnits30d: salesSummary.totalUnits30d,
      totalRevenue30d: salesSummary.totalRevenue30d,
      topProducts: salesSummary.topProducts.slice(0, 4)
    },
    trendSignals
  });
}
