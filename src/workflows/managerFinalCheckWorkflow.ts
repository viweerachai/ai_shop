import { decideFinalStatus } from "../business/autoModeRules.js";
import { nowIso } from "../utils/date.js";
import { logger } from "../utils/logger.js";
import { WorkflowContext } from "./context.js";

export async function managerFinalCheckWorkflow({ repos }: WorkflowContext) {
  const [plans, products] = await Promise.all([
    repos.contentPlans.where((plan) => plan.status === "manager_final_check"),
    repos.processedProducts.all()
  ]);
  const productsBySku = new Map(products.map((product) => [product.sku, product]));
  let ready = 0;
  let ownerReview = 0;
  let rewrite = 0;

  for (const plan of plans) {
    const decision = decideFinalStatus(plan, productsBySku.get(plan.related_product_sku));
    if (decision.status === "ready_to_post") ready += 1;
    if (decision.status === "owner_review_required") ownerReview += 1;
    if (decision.status === "needs_rewrite") rewrite += 1;
    await repos.contentPlans.upsert([{
      ...plan,
      status: decision.status,
      manager_decision: decision.status,
      owner_status: decision.ownerReviewRequired ? "pending" : plan.owner_status,
      qa_note: [plan.qa_note, decision.managerNote].filter(Boolean).join(" "),
      updated_at: nowIso()
    }]);
  }
  logger.info({ checked: plans.length, ready, ownerReview, rewrite }, "Manager final check finished");
  return { checked: plans.length, ready, ownerReview, rewrite };
}
