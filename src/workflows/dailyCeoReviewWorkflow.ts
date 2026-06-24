import { createSalesAnalytics } from "../business/salesAnalytics.js";
import { createCeoStrategy } from "../agents/ceoAgent.js";
import { WorkflowContext } from "./context.js";

export async function dailyCeoReviewWorkflow({ repos, claude }: WorkflowContext) {
  if (!claude) {
    throw new Error("ANTHROPIC_API_KEY is required for CEO workflow.");
  }
  const [products, content, promotions, salesOrders, trendSignals, errors, examples] = await Promise.all([
    repos.processedProducts.all(),
    repos.contentPlans.all(),
    repos.promotionPlans.all(),
    repos.salesOrders.all(),
    repos.trendSignals.active(),
    repos.errorMemory.active(),
    repos.approvedExamples.active()
  ]);
  const salesSummary = createSalesAnalytics(salesOrders);
  return createCeoStrategy(repos, claude, {
    products,
    content,
    promotions,
    salesOrders,
    salesSummary: {
      totalOrders30d: salesSummary.totalOrders30d,
      totalUnits30d: salesSummary.totalUnits30d,
      totalRevenue30d: salesSummary.totalRevenue30d,
      topProducts: salesSummary.topProducts.slice(0, 4)
    },
    trendSignals,
    errors,
    approvedExamples: examples
  });
}
