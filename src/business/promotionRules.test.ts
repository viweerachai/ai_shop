import { describe, expect, it } from "vitest";
import { canApprovePromotion } from "./promotionRules.js";
import { PromotionPlan } from "../types/promotion.js";
import { ProcessedProduct } from "../types/product.js";

const promotion: PromotionPlan = {
  promo_id: "promo-1",
  promo_type: "discount",
  related_product_sku: "SKU-1",
  bundle_sku: "",
  discount_type: "percent",
  discount_value: "10",
  start_date: "",
  end_date: "",
  reason: "",
  expected_goal: "",
  risk_note: "",
  manager_note: "",
  status: "suggested",
  created_by: "AI",
  created_at: "",
  approved_at: ""
};

const product: ProcessedProduct = {
  product_id: "p1", sku: "SKU-1", title_th: "", short_description: "",
  long_description: "", keywords: "", category: "", product_type: "figure",
  is_blind_box: false, is_preorder: false, is_new_arrival: false,
  arrival_date: "", stock: 2, cost_price: 500, selling_price: 1000,
  margin_percent: 50, publish_priority: 0, launch_post_needed: false,
  launch_post_done: false, available_assets: "", asset_note: "",
  can_make_unboxing: false, can_make_review: false, can_make_product_showcase: true,
  content_used_count: 0, last_content_date: "", risk_level: "low",
  risk_note: "", status: "product_ready", created_at: "", updated_at: ""
};

describe("promotion approval rules", () => {
  it("allows a suggested discount when cost and margin exist", () => {
    expect(canApprovePromotion(promotion, product).allowed).toBe(true);
  });

  it("blocks direct discount when margin is unknown", () => {
    const decision = canApprovePromotion(promotion, {
      ...product,
      cost_price: null,
      margin_percent: null
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("cost and margin");
  });

  it("blocks a promotion that is no longer suggested", () => {
    expect(canApprovePromotion({ ...promotion, status: "approved" }, product).allowed)
      .toBe(false);
  });

  it("allows a bundle suggestion without margin data", () => {
    expect(canApprovePromotion(
      { ...promotion, promo_type: "bundle", discount_type: "", discount_value: "" },
      { ...product, cost_price: null, margin_percent: null }
    ).allowed).toBe(true);
  });
});
