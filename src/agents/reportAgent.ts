import { ContentPlan } from "../types/content.js";
import { ProcessedProduct } from "../types/product.js";
import { PromotionPlan } from "../types/promotion.js";

export function createDailyReport(
  products: ProcessedProduct[],
  content: ContentPlan[],
  promotions: PromotionPlan[]
): string {
  const lines = [
    "AI Shop Daily Report",
    `Products ready: ${products.filter((item) => item.status === "product_ready").length}`,
    `Products awaiting work: ${products.filter((item) => item.status !== "product_ready").length}`,
    `Content created: ${content.length}`,
    `Content waiting for QA: ${content.filter((item) => item.status === "content_ready_for_qa").length}`,
    `Content waiting for owner: ${content.filter((item) => item.status === "ready_for_owner_review" || item.status === "owner_review_required").length}`,
    `Promotions suggested: ${promotions.filter((item) => item.status === "suggested").length}`,
    `Risky issues: ${content.filter((item) => item.status === "owner_review_required").length + products.filter((item) => item.risk_level === "high").length}`
  ];
  const next = products.some((item) => item.is_new_arrival && !item.launch_post_done)
    ? "Create launch content for pending new arrivals."
    : content.some((item) => item.status === "needs_rewrite")
      ? "Resolve content rewrites."
      : "Review owner-approval queue and suggested promotions.";
  return [...lines, `Next recommended action: ${next}`].join("\n");
}
