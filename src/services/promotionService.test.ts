import { describe, expect, it } from "vitest";
import { createPromotionView } from "./promotionService.js";
import { createActionPromotionView } from "./strategyArtifacts.js";
import { PromotionPlan } from "../types/promotion.js";
import { ProcessedProduct } from "../types/product.js";
import { StrategyActionArtifact } from "../types/strategyAction.js";

const promotion: PromotionPlan = {
  promo_id: "promo-1",
  promo_type: "bundle",
  related_product_sku: "SKU-1",
  bundle_sku: "SKU-2",
  discount_type: "",
  discount_value: "",
  start_date: "2026-06-18",
  end_date: "2026-06-20",
  reason: "เพิ่มยอดต่อบิล",
  expected_goal: "เพิ่ม AOV",
  risk_note: "",
  manager_note: "รอเช็กคู่สินค้าที่เข้ากัน",
  status: "suggested",
  created_by: "AI Sales Analyst",
  created_at: "2026-06-17T10:00:00.000Z",
  approved_at: ""
};

const product: ProcessedProduct = {
  product_id: "p1",
  sku: "SKU-1",
  title_th: "Sample Figure",
  short_description: "",
  long_description: "",
  keywords: "",
  category: "figure",
  product_type: "figure",
  is_blind_box: false,
  is_preorder: false,
  is_new_arrival: true,
  arrival_date: "",
  stock: 16,
  cost_price: 500,
  selling_price: 950,
  margin_percent: 47,
  publish_priority: 90,
  launch_post_needed: false,
  launch_post_done: false,
  available_assets: "",
  asset_note: "",
  can_make_unboxing: false,
  can_make_review: true,
  can_make_product_showcase: true,
  content_used_count: 0,
  last_content_date: "",
  risk_level: "low",
  risk_note: "",
  status: "product_ready",
  created_at: "",
  updated_at: ""
};

describe("promotion view", () => {
  it("maps promotion intelligence into the UI shape", () => {
    const view = createPromotionView(promotion, product, {
      strategy: {
        shop_priority: "",
        priority_products: ["SKU-1"],
        focus_categories: [],
        weekly_direction: "",
        instruction_to_marketing: "",
        instruction_to_manager: ""
      },
      campaign: {
        name: "Collector Week",
        productFocus: ["SKU-1"],
        warnings: []
      }
    });

    expect(view.productName).toBe("Sample Figure");
    expect(view.routeLabel).toBe("Bundle pair");
    expect(view.riskLevel).toBe("low");
    expect(view.approvalReadiness).toBe("needs_review");
    expect(view.strategyLabels).toEqual(expect.arrayContaining([
      "CEO priority",
      "Campaign focus",
      "New arrival",
      "Stock push",
      "Margin ready"
    ]));
    expect(view.watchouts).toContain("รอเช็กคู่สินค้าที่เข้ากัน");
  });

  it("maps action artifacts into promotion suggestions", () => {
    const artifact: StrategyActionArtifact = {
      artifactId: "artifact-promo",
      actionId: "promo-gate-shared",
      kind: "promotion_plan",
      status: "open",
      title: "Promotion Review Queue",
      summary: "ตรวจความพร้อมของโปรโมชั่นก่อนสื่อสาร",
      owner: "Manager",
      sku: "SKU-1",
      promotionType: "bundle",
      createdAt: "2026-06-17T10:00:00.000Z",
      updatedAt: "2026-06-17T10:00:00.000Z"
    };

    const view = createActionPromotionView(artifact, product);
    expect(view.status).toBe("suggested");
    expect(view.routeLabel).toBe("Bundle pair");
    expect(view.strategyLabels).toContain("Action queue");
  });
});
