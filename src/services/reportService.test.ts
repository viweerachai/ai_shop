import { describe, expect, it } from "vitest";
import { createReportView } from "./reportService.js";
import { ContentPlan } from "../types/content.js";
import { ProcessedProduct } from "../types/product.js";
import { PromotionPlan } from "../types/promotion.js";
import { SalesOrder } from "../types/salesOrder.js";

const baseProduct: ProcessedProduct = {
  product_id: "p1",
  sku: "SKU-1",
  title_th: "Ready Product",
  short_description: "",
  long_description: "",
  keywords: "",
  category: "",
  product_type: "",
  is_blind_box: false,
  is_preorder: false,
  is_new_arrival: false,
  arrival_date: "",
  stock: 1,
  cost_price: 100,
  selling_price: 200,
  margin_percent: 50,
  publish_priority: 10,
  launch_post_needed: false,
  launch_post_done: false,
  available_assets: "",
  asset_note: "",
  can_make_unboxing: false,
  can_make_review: false,
  can_make_product_showcase: true,
  content_used_count: 0,
  last_content_date: "",
  risk_level: "low",
  risk_note: "",
  status: "product_ready",
  created_at: "",
  updated_at: ""
};

const baseContent: ContentPlan = {
  content_id: "c1",
  week: "",
  content_type: "knowledge",
  theme: "Ready Content",
  related_product_sku: "SKU-1",
  target_platform: "Facebook",
  status: "ready_to_post",
  idea: "",
  caption_draft: "",
  hashtags: "",
  writer_note: "",
  content_key: "",
  risk_note: "",
  final_risk_level: "low",
  qa_status: "passed",
  qa_score: 95,
  qa_issues: "",
  qa_note: "",
  manager_decision: "",
  rewrite_instruction: "",
  image_type: "",
  image_prompt: "",
  image_concept: "",
  image_text: "",
  image_note: "",
  image_status: "image_brief_ready",
  publish_date: "",
  owner_status: "approved",
  created_at: "",
  updated_at: ""
};

const basePromotion: PromotionPlan = {
  promo_id: "promo-1",
  promo_type: "bundle",
  related_product_sku: "SKU-1",
  bundle_sku: "SKU-2",
  discount_type: "",
  discount_value: "",
  start_date: "",
  end_date: "",
  reason: "",
  expected_goal: "",
  risk_note: "",
  manager_note: "",
  status: "approved",
  created_by: "AI",
  created_at: "",
  approved_at: ""
};

const baseSalesOrder: SalesOrder = {
  order_id: "order-1",
  ordered_at: "2026-06-15T00:00:00.000Z",
  sku: "SKU-1",
  product_name: "Ready Product",
  quantity: 2,
  net_sales: 400,
  channel: "Shopee",
  order_status: "paid",
  note: ""
};

describe("createReportView", () => {
  it("summarizes workflow health and recommendations", () => {
    const report = createReportView([baseProduct], [baseContent], [basePromotion], [baseSalesOrder], "2026-06-16T00:00:00.000Z");
    expect(report.healthScore).toBe(100);
    expect(report.metrics.find((item) => item.id === "ready-products")?.value).toBe(1);
    expect(report.workflow.find((item) => item.id === "content")?.completed).toBe(1);
    expect(report.recommendations.some((item) => item.id === "rec-ready-post")).toBe(true);
    expect(report.sales.totalOrders30d).toBe(1);
  });

  it("surfaces product, content, and promotion risks", () => {
    const riskyProduct = { ...baseProduct, product_id: "p2", title_th: "Risky Product", risk_level: "high", risk_note: "Blind Box wording", status: "needs_product_rewrite" };
    const riskyContent = { ...baseContent, content_id: "c2", theme: "Needs Rewrite", status: "needs_rewrite", final_risk_level: "medium" as const, rewrite_instruction: "Add random wording" };
    const heldPromotion = { ...basePromotion, promo_id: "promo-2", status: "hold" as const, risk_note: "No margin data" };
    const report = createReportView([baseProduct, riskyProduct], [baseContent, riskyContent], [basePromotion, heldPromotion], [baseSalesOrder]);
    expect(report.healthScore).toBeLessThan(100);
    expect(report.risks.map((item) => item.source)).toEqual(expect.arrayContaining(["product", "content", "promotion"]));
    expect(report.recommendations.map((item) => item.priority)).toContain("high");
  });
});
