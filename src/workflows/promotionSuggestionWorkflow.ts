import { createSalesAnalytics } from "../business/salesAnalytics.js";
import { suggestPromotions } from "../agents/salesAnalystAgent.js";
import { nowIso } from "../utils/date.js";
import { createId } from "../utils/ids.js";
import { logger } from "../utils/logger.js";
import { WorkflowContext } from "./context.js";
import { dailyCeoReviewWorkflow } from "./dailyCeoReviewWorkflow.js";
import { marketingCampaignWorkflow } from "./marketingCampaignWorkflow.js";
import { CeoStrategy, MarketingCampaign } from "../types/agent.js";

export async function promotionSuggestionWorkflow(
  { repos, gemini, claude }: WorkflowContext,
  strategy?: CeoStrategy,
  campaignInput?: MarketingCampaign
) {
  const [products, salesOrders, trendSignals] = await Promise.all([
    repos.processedProducts.where(
      (product) => product.status === "product_ready" && (product.stock ?? 0) > 0
    ),
    repos.salesOrders.all(),
    repos.trendSignals.active()
  ]);
  const ceoStrategy = strategy ?? await dailyCeoReviewWorkflow({ repos, gemini, claude });
  const campaign = campaignInput ?? await marketingCampaignWorkflow({ repos, gemini, claude }, ceoStrategy);
  const salesSummary = createSalesAnalytics(salesOrders);
  const suggestions = await suggestPromotions(repos, gemini, {
    products,
    strategy: ceoStrategy,
    campaign,
    salesSummary: {
      totalOrders30d: salesSummary.totalOrders30d,
      totalUnits30d: salesSummary.totalUnits30d,
      totalRevenue30d: salesSummary.totalRevenue30d,
      topProducts: salesSummary.topProducts.slice(0, 4)
    },
    trendSignals
  });
  const rows = suggestions.map((suggestion) => ({
    ...suggestion,
    promo_id: createId("promo"),
    status: "suggested" as const,
    created_by: "AI Sales Analyst",
    created_at: nowIso(),
    approved_at: ""
  }));
  await repos.promotionPlans.append(rows);
  logger.info({ count: rows.length }, "Promotion suggestions created");
  return { suggested: rows.length };
}
