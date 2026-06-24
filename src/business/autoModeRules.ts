import { ContentPlan } from "../types/content.js";
import { ProcessedProduct } from "../types/product.js";
import { getSystemSettings } from "../runtime/systemSettings.js";

const riskRank = { low: 0, medium: 1, high: 2 } as const;

export interface FinalDecision {
  status: "ready_to_post" | "owner_review_required" | "needs_rewrite";
  managerNote: string;
  ownerReviewRequired: boolean;
}

export function decideFinalStatus(
  content: ContentPlan,
  product?: ProcessedProduct
): FinalDecision {
  const settings = getSystemSettings();
  if (content.qa_score < settings.minScore || content.qa_status !== "passed") {
    return {
      status: "needs_rewrite",
      managerNote: `QA score must be at least ${settings.minScore}.`,
      ownerReviewRequired: false
    };
  }
  const isPromotion = ["promotion", "sale", "bundle"].includes(content.content_type);
  const hasProductProblem =
    Boolean(product) &&
    (product?.status !== "product_ready" || product?.risk_level === "high");
  const riskTooHigh =
    riskRank[content.final_risk_level] > riskRank[settings.maxRisk];

  if (
    settings.autoMode === "semi_auto" ||
    isPromotion ||
    hasProductProblem ||
    riskTooHigh
  ) {
    return {
      status: "owner_review_required",
      managerNote: isPromotion
        ? "Promotion-related content always requires owner approval."
        : "Owner review is required by auto-mode or risk policy.",
      ownerReviewRequired: true
    };
  }
  return {
    status: "ready_to_post",
    managerNote: settings.autoPublish
      ? "Passed final check and is eligible for publishing."
      : "Passed final check. AUTO_PUBLISH is off, so the item is ready only.",
    ownerReviewRequired: false
  };
}
