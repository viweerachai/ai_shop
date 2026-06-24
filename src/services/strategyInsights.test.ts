import { describe, expect, it } from "vitest";
import { buildStrategyBrief } from "./strategyInsights.js";
import { ProcessedProduct } from "../types/product.js";
import { ContentPlan } from "../types/content.js";
import { PromotionPlan } from "../types/promotion.js";
import { createSalesAnalytics } from "../business/salesAnalytics.js";
import { SalesOrder } from "../types/salesOrder.js";

const products: ProcessedProduct[] = [
  {
    product_id: "p1",
    sku: "SKU-TOP",
    title_th: "สินค้าขายดี",
    short_description: "",
    long_description: "",
    keywords: "",
    category: "Figure",
    product_type: "figure",
    is_blind_box: false,
    is_preorder: false,
    is_new_arrival: true,
    arrival_date: "",
    stock: 4,
    cost_price: 500,
    selling_price: 890,
    margin_percent: 43,
    publish_priority: 90,
    launch_post_needed: true,
    launch_post_done: false,
    available_assets: "product_photo,video",
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
  },
  {
    product_id: "p2",
    sku: "SKU-SLOW",
    title_th: "สินค้าสต็อกช้า",
    short_description: "",
    long_description: "",
    keywords: "",
    category: "Blind Box",
    product_type: "blind_box",
    is_blind_box: true,
    is_preorder: false,
    is_new_arrival: false,
    arrival_date: "",
    stock: 18,
    cost_price: 300,
    selling_price: 590,
    margin_percent: 49,
    publish_priority: 60,
    launch_post_needed: false,
    launch_post_done: false,
    available_assets: "product_photo",
    asset_note: "",
    can_make_unboxing: false,
    can_make_review: false,
    can_make_product_showcase: true,
    content_used_count: 2,
    last_content_date: "",
    risk_level: "low",
    risk_note: "",
    status: "product_ready",
    created_at: "",
    updated_at: ""
  }
];

const content: ContentPlan[] = [
  {
    content_id: "c1",
    week: "",
    content_type: "review",
    theme: "สินค้าขายดี",
    related_product_sku: "SKU-TOP",
    target_platform: "Facebook",
    status: "owner_review_required",
    idea: "",
    caption_draft: "",
    hashtags: "",
    writer_note: "",
    content_key: "",
    risk_note: "",
    final_risk_level: "low",
    qa_status: "",
    qa_score: 90,
    qa_issues: "",
    qa_note: "",
    manager_decision: "",
    rewrite_instruction: "",
    image_type: "",
    image_prompt: "",
    image_concept: "",
    image_text: "",
    image_note: "",
    image_status: "",
    publish_date: "",
    owner_status: "pending",
    created_at: "",
    updated_at: ""
  }
];

const promotions: PromotionPlan[] = [
  {
    promo_id: "promo-1",
    promo_type: "bundle",
    related_product_sku: "SKU-SLOW",
    bundle_sku: "SKU-PAIR",
    discount_type: "",
    discount_value: "",
    start_date: "",
    end_date: "",
    reason: "",
    expected_goal: "",
    risk_note: "",
    manager_note: "",
    status: "suggested",
    created_by: "AI Sales Analyst",
    created_at: "",
    approved_at: ""
  }
];

const salesOrders: SalesOrder[] = [
  {
    order_id: "o1",
    ordered_at: "2026-06-15T10:00:00.000Z",
    channel: "Shopee",
    sku: "SKU-TOP",
    product_name: "สินค้าขายดี",
    quantity: 2,
    gross_sales: 1780,
    net_sales: 1780,
    order_status: "paid"
  },
  {
    order_id: "o2",
    ordered_at: "2026-06-14T10:00:00.000Z",
    channel: "Shopee",
    sku: "SKU-TOP",
    product_name: "สินค้าขายดี",
    quantity: 2,
    gross_sales: 1780,
    net_sales: 1780,
    order_status: "paid"
  },
  {
    order_id: "o3",
    ordered_at: "2026-06-02T10:00:00.000Z",
    channel: "TikTok",
    sku: "SKU-SLOW",
    product_name: "สินค้าสต็อกช้า",
    quantity: 1,
    gross_sales: 590,
    net_sales: 590,
    order_status: "paid"
  }
];

describe("strategy insights action queue", () => {
  it("builds actionable tasks from sales signals and queue pressure", () => {
    const sales = createSalesAnalytics(salesOrders, {
      now: new Date("2026-06-17T00:00:00.000Z")
    });
    const brief = buildStrategyBrief(products, content, promotions, null, sales);

    expect(brief.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        owner: "Manager",
        priority: "high",
        sku: "SKU-TOP",
        source: "sales"
      }),
      expect.objectContaining({
        owner: "Marketing",
        sku: "SKU-SLOW",
        status: "watch"
      }),
      expect.objectContaining({
        owner: "Owner",
        status: "blocked",
        source: "content"
      })
    ]));
  });
});
