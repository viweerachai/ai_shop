import { ProcessedProduct } from "../types/product.js";
import { PromotionPlan } from "../types/promotion.js";

export interface PromotionApprovalDecision {
  allowed: boolean;
  reason: string;
}

export function canApprovePromotion(
  promotion: PromotionPlan,
  product?: ProcessedProduct
): PromotionApprovalDecision {
  if (promotion.status !== "suggested") {
    return { allowed: false, reason: "Only suggested promotions can be approved." };
  }
  const isDirectDiscount =
    promotion.promo_type === "discount" ||
    Boolean(promotion.discount_type) ||
    Boolean(promotion.discount_value);
  if (
    isDirectDiscount &&
    (!product || product.cost_price === null || product.margin_percent === null)
  ) {
    return {
      allowed: false,
      reason: "Direct discount requires cost and margin data."
    };
  }
  return { allowed: true, reason: "" };
}
