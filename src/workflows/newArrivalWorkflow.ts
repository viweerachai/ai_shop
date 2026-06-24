import { planContent } from "../agents/contentPlannerAgent.js";
import { nowIso } from "../utils/date.js";
import { logger } from "../utils/logger.js";
import { toContentRow } from "./contentHelpers.js";
import { WorkflowContext } from "./context.js";

export async function newArrivalWorkflow({ repos, gemini }: WorkflowContext) {
  const [products, existing] = await Promise.all([
    repos.processedProducts.where(
      (product) =>
        product.is_new_arrival &&
        product.launch_post_needed &&
        !product.launch_post_done &&
        product.status === "product_ready"
    ),
    repos.contentPlans.all()
  ]);
  logger.info({ count: products.length }, "Planning new arrival content");
  let created = 0;
  for (const product of products) {
    const plans = await planContent(repos, gemini, {
      products: [product],
      existingContentKeys: existing.map((item) => item.content_key),
      count: 3,
      strategy: {
        launch_product_sku: product.sku,
        priority_reason: "สินค้าเข้าใหม่ต้องมี launch-supporting posts ก่อนเข้าคิวปกติ"
      },
      campaign: {
        requiredTypes: ["new arrival", "product knowledge", "engagement"],
        note: "Create 1 to 3 launch-supporting posts."
      }
    });
    const rows = plans.slice(0, 3).map((plan) => toContentRow(plan, {
      writerNote: "Launch support content | New arrival priority",
      riskNote: product.is_blind_box ? "Guardrail: ห้ามใช้ถ้อยคำสื่อว่าเลือกลายได้" : ""
    }));
    await repos.contentPlans.append(rows);
    await repos.processedProducts.upsert([{
      ...product,
      launch_post_done: rows.length > 0,
      updated_at: nowIso()
    }]);
    created += rows.length;
  }
  return { products: products.length, created };
}
