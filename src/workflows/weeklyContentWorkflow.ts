import { planContent } from "../agents/contentPlannerAgent.js";
import { logger } from "../utils/logger.js";
import { prioritySort, toContentRow } from "./contentHelpers.js";
import { WorkflowContext } from "./context.js";
import { dailyCeoReviewWorkflow } from "./dailyCeoReviewWorkflow.js";
import { marketingCampaignWorkflow } from "./marketingCampaignWorkflow.js";
import { CeoStrategy, MarketingCampaign } from "../types/agent.js";

export async function weeklyContentWorkflow(
  { repos, gemini, claude }: WorkflowContext,
  count = 7,
  strategy?: CeoStrategy,
  campaignInput?: MarketingCampaign
) {
  const [products, existing, trendSignals] = await Promise.all([
    repos.processedProducts.where((product) => product.status === "product_ready"),
    repos.contentPlans.all(),
    repos.trendSignals.active()
  ]);
  const ceoStrategy = strategy ?? await dailyCeoReviewWorkflow({ repos, gemini, claude });
  const campaign = campaignInput ?? await marketingCampaignWorkflow({ repos, gemini, claude }, ceoStrategy);
  const prioritized = prioritySort(products, {
    ceoPrioritySkus: ceoStrategy.priority_products,
    marketingFocusSkus: campaign.product_focus,
    getSku: (product) => product.sku
  });
  const plans = await planContent(repos, gemini, {
    products: prioritized,
    existingContentKeys: existing.map((item) => item.content_key),
    count,
    strategy: ceoStrategy,
    campaign,
    trendSignals
  });
  const bySku = new Map(prioritized.map((product) => [product.sku, product]));
  const ceoPriority = new Set(ceoStrategy.priority_products);
  const marketingFocus = new Set(campaign.product_focus);
  const rows = plans.slice(0, count).map((plan) => {
    const product = bySku.get(plan.related_product_sku);
    const writerNotes = [
      ceoPriority.has(plan.related_product_sku) ? "CEO priority product" : "",
      marketingFocus.has(plan.related_product_sku) ? `Campaign: ${campaign.campaign_name}` : "",
      ceoStrategy.instruction_to_marketing ? `Brief: ${ceoStrategy.instruction_to_marketing}` : ""
    ].filter(Boolean).join(" | ");
    const riskNotes = [
      product?.risk_note ? `Product risk: ${product.risk_note}` : "",
      product?.is_preorder ? "Guardrail: preorder ต้องย้ำเงื่อนไขให้ชัด" : "",
      product?.is_blind_box ? "Guardrail: ห้ามใช้ถ้อยคำสื่อว่าเลือกลายได้" : ""
    ].filter(Boolean).join(" | ");
    return toContentRow(plan, { writerNote: writerNotes, riskNote: riskNotes });
  });
  await repos.contentPlans.append(rows);
  logger.info({ created: rows.length }, "Weekly content plan created");
  return { created: rows.length };
}
