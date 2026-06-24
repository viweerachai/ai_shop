import { describe, expect, it } from "vitest";
import { createProductViewWithSales } from "./productService.js";
import { RawProduct, ProcessedProduct } from "../types/product.js";

const raw: RawProduct = {
  product_id: "p1",
  sku: "SKU-1",
  source_name: "Source Product",
  source_description: "",
  source_category: "Figure",
  source_price: 1000,
  cost_price: 600,
  selling_price: null,
  stock: 4,
  image_url_1: "https://example.com/image.jpg",
  image_url_2: "",
  image_url_3: "",
  product_url: "",
  note: "",
  status: "processed",
  created_at: "2026-06-01T00:00:00.000Z",
  updated_at: ""
};

const processed: ProcessedProduct = {
  product_id: "p1",
  sku: "SKU-1",
  title_th: "สินค้าทดสอบ",
  short_description: "",
  long_description: "",
  keywords: "",
  category: "Figure",
  product_type: "figure",
  is_blind_box: false,
  is_preorder: false,
  is_new_arrival: true,
  arrival_date: "2026-06-01",
  stock: 4,
  cost_price: 600,
  selling_price: 1000,
  margin_percent: 40,
  publish_priority: 92,
  launch_post_needed: true,
  launch_post_done: false,
  available_assets: "product_photo, opened_photo",
  asset_note: "",
  can_make_unboxing: true,
  can_make_review: true,
  can_make_product_showcase: true,
  content_used_count: 0,
  last_content_date: "",
  risk_level: "low",
  risk_note: "",
  status: "product_ready",
  created_at: "",
  updated_at: "2026-06-15T00:00:00.000Z"
};

describe("product view", () => {
  it("combines raw and processed data for the UI", () => {
    const view = createProductViewWithSales(raw, processed, {
      sku: "SKU-1",
      productName: "สินค้าทดสอบ",
      units7d: 3,
      units30d: 7,
      revenue7d: 3000,
      revenue30d: 7000,
      orders7d: 2,
      orders30d: 4,
      lastOrderedAt: "2026-06-14T10:00:00.000Z",
      channels: ["Shopee"]
    });
    expect(view.name).toBe("สินค้าทดสอบ");
    expect(view.availableAssets).toEqual(["product_photo", "opened_photo"]);
    expect(view.contentEligible).toBe(true);
    expect(view.isNewArrival).toBe(true);
    expect(view.salesLast30d).toBe(7);
    expect(view.salesStatus).toBe("restock_risk");
    expect(view.salesLabels).toContain("Restock risk");
  });

  it("blocks content when processed data has high risk", () => {
    const view = createProductViewWithSales(raw, { ...processed, risk_level: "high" });
    expect(view.contentEligible).toBe(false);
    expect(view.riskLevel).toBe("high");
  });

  it("shows an unprocessed raw product as needing a product check", () => {
    const view = createProductViewWithSales({ ...raw, status: "new" });
    expect(view.status).toBe("new");
    expect(view.missingFields).toEqual(["product_check_not_run"]);
    expect(view.contentEligible).toBe(false);
  });
});
