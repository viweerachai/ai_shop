import { describe, expect, it } from "vitest";
import { derivePromotionIntelligence } from "./promotionStrategyRules.js";

describe("promotion strategy rules", () => {
  it("surfaces CEO, campaign, stock, and margin signals for a ready discount", () => {
    const intelligence = derivePromotionIntelligence({
      promo_type: "discount",
      discount_type: "percent",
      discount_value: "10",
      related_product_sku: "SKU-1",
      risk_note: "",
      manager_note: ""
    }, {
      sku: "SKU-1",
      stock: 14,
      margin_percent: 42,
      cost_price: 500,
      publish_priority: 88,
      is_new_arrival: true,
      is_preorder: false,
      risk_level: "low",
      risk_note: ""
    }, {
      strategy: { priority_products: ["SKU-1"] },
      campaign: { name: "Collector Week", productFocus: ["SKU-1"], warnings: [] },
      sales: { units7d: 5, units30d: 12, revenue30d: 9400, orders30d: 6 },
      approvalAllowed: true,
      approvalReason: ""
    });

    expect(intelligence.riskLevel).toBe("low");
    expect(intelligence.approvalReadiness).toBe("ready");
    expect(intelligence.strategyLabels).toEqual(expect.arrayContaining([
      "CEO priority",
      "Campaign focus",
      "New arrival",
      "Stock push",
      "Top seller",
      "Margin ready"
    ]));
    expect(intelligence.decisionSummary).toContain("CEO priority");
    expect(intelligence.decisionSummary).toContain("margin 42%");
  });

  it("blocks direct discount when margin is missing and adds guardrails", () => {
    const intelligence = derivePromotionIntelligence({
      promo_type: "discount",
      discount_type: "percent",
      discount_value: "20",
      related_product_sku: "PRE-1",
      risk_note: "ไม่มีข้อมูลต้นทุน",
      manager_note: "ควรเปลี่ยนเป็น bundle"
    }, {
      sku: "PRE-1",
      stock: 3,
      margin_percent: null,
      cost_price: null,
      publish_priority: 55,
      is_new_arrival: false,
      is_preorder: true,
      risk_level: "medium",
      risk_note: "สินค้านี้ต้องระบุเงื่อนไขพรีออเดอร์"
    }, {
      strategy: { priority_products: [] },
      campaign: { name: "Preorder Watch", productFocus: [], warnings: [] },
      approvalAllowed: false,
      approvalReason: "Direct discount requires cost and margin data."
    });

    expect(intelligence.riskLevel).toBe("high");
    expect(intelligence.approvalReadiness).toBe("blocked");
    expect(intelligence.strategyLabels).toEqual(expect.arrayContaining([
      "Low stock",
      "Margin missing",
      "Preorder guardrail"
    ]));
    expect(intelligence.watchouts).toContain("Direct discount requires cost and margin data.");
    expect(intelligence.watchouts).toContain("ยังไม่มีข้อมูลต้นทุนหรือ margin ครบถ้วน");
  });
});
