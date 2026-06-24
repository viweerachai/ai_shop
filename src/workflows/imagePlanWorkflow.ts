import { planImage } from "../agents/imageCreativeAgent.js";
import { nowIso } from "../utils/date.js";
import { logger } from "../utils/logger.js";
import { WorkflowContext } from "./context.js";

export async function imagePlanWorkflow({ repos, gemini }: WorkflowContext) {
  const [plans, products] = await Promise.all([
    repos.contentPlans.where((plan) => plan.status === "content_passed"),
    repos.processedProducts.all()
  ]);
  const bySku = new Map(products.map((product) => [product.sku, product]));
  logger.info({ count: plans.length }, "Creating image briefs");
  for (const plan of plans) {
    const image = await planImage(repos, gemini, plan, bySku.get(plan.related_product_sku));
    await repos.contentPlans.upsert([{
      ...plan,
      ...image,
      image_status: "image_brief_ready",
      status: "manager_final_check",
      updated_at: nowIso()
    }]);
  }
  return { planned: plans.length };
}
