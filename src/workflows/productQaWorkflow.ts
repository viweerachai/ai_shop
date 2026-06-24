import { qaProductText } from "../agents/productQaAgent.js";
import { nowIso } from "../utils/date.js";
import { createId } from "../utils/ids.js";
import { logger } from "../utils/logger.js";
import { WorkflowContext } from "./context.js";

export async function productQaWorkflow({ repos, gemini }: WorkflowContext) {
  const products = await repos.processedProducts.where(
    (product) => product.status === "product_text_ready_for_qa"
  );
  logger.info({ count: products.length }, "Checking product copy");
  for (const product of products) {
    const qa = await qaProductText(repos, gemini, product);
    await repos.processedProducts.upsert([{
      ...product,
      risk_level: qa.risk_level,
      risk_note: qa.note,
      status: qa.passed ? "product_ready" : "needs_product_rewrite",
      updated_at: nowIso()
    }]);
    if (!qa.passed && qa.correction_rule) {
      await repos.errorMemory.append([{
        error_id: createId("err"),
        source: `product:${product.sku}`,
        error_type: qa.issues[0] ?? "product_qa",
        description: qa.note,
        correction_rule: qa.correction_rule,
        example_bad: "",
        example_good: "",
        active: true,
        created_at: nowIso()
      }]);
    }
  }
  return { checked: products.length };
}
