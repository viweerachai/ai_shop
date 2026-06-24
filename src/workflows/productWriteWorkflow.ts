import { writeProductText } from "../agents/productWriterAgent.js";
import { nowIso } from "../utils/date.js";
import { logger } from "../utils/logger.js";
import { WorkflowContext } from "./context.js";

export async function productWriteWorkflow({ repos, gemini }: WorkflowContext) {
  const products = await repos.processedProducts.where((product) =>
    ["needs_product_text", "needs_product_rewrite"].includes(product.status)
  );
  logger.info({ count: products.length }, "Writing product copy");
  for (const product of products) {
    const copy = await writeProductText(repos, gemini, product);
    await repos.processedProducts.upsert([{
      ...product,
      ...copy,
      keywords: copy.keywords.join(", "),
      status: "product_text_ready_for_qa",
      updated_at: nowIso()
    }]);
  }
  return { written: products.length };
}
