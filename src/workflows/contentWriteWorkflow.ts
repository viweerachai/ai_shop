import { writeContent } from "../agents/contentWriterAgent.js";
import { nowIso } from "../utils/date.js";
import { logger } from "../utils/logger.js";
import { WorkflowContext } from "./context.js";

export async function contentWriteWorkflow({ repos, gemini }: WorkflowContext) {
  const [plans, products] = await Promise.all([
    repos.contentPlans.where((plan) => ["ready_to_write", "needs_rewrite"].includes(plan.status)),
    repos.processedProducts.all()
  ]);
  const bySku = new Map(products.map((product) => [product.sku, product]));
  logger.info({ count: plans.length }, "Writing content");
  for (const plan of plans) {
    const output = await writeContent(repos, gemini, plan, bySku.get(plan.related_product_sku));
    const writerNote = [plan.writer_note, output.writer_note].filter(Boolean).join(" | ");
    const riskNote = [plan.risk_note, output.risk_note].filter(Boolean).join(" | ");
    await repos.contentPlans.upsert([{
      ...plan,
      ...output,
      hashtags: output.hashtags.join(" "),
      writer_note: writerNote,
      risk_note: riskNote,
      status: "content_ready_for_qa",
      updated_at: nowIso()
    }]);
  }
  return { written: plans.length };
}
