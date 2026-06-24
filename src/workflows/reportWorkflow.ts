import { createDailyReport } from "../agents/reportAgent.js";
import { WorkflowContext } from "./context.js";

export async function reportWorkflow({ repos }: WorkflowContext) {
  const [products, content, promotions] = await Promise.all([
    repos.processedProducts.all(),
    repos.contentPlans.all(),
    repos.promotionPlans.all()
  ]);
  return createDailyReport(products, content, promotions);
}
