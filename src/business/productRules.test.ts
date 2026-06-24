import { describe, expect, it } from "vitest";
import { enforceAssetRules, getMissingProductFields } from "./productRules.js";
import { RawProduct } from "../types/product.js";

const raw: RawProduct = {
  product_id: "p1",
  sku: "SKU-1",
  source_name: "Blind Box",
  source_description: "",
  source_category: "",
  source_price: 590,
  cost_price: null,
  selling_price: null,
  stock: 2,
  image_url_1: "https://example.com/product.jpg",
  image_url_2: "",
  image_url_3: "",
  product_url: "",
  note: "",
  status: "new",
  created_at: "",
  updated_at: ""
};

describe("product rules", () => {
  it("blocks unboxing when no opened asset or video exists", () => {
    const result = enforceAssetRules({
      available_assets: ["product_photo", "box_photo"],
      can_make_unboxing: true,
      can_make_review: true
    });
    expect(result.can_make_unboxing).toBe(false);
  });

  it("blocks unboxing even when a real opened photo exists", () => {
    const result = enforceAssetRules({
      available_assets: ["product_photo", "opened_photo"],
      can_make_unboxing: true,
      can_make_review: true
    });
    expect(result.can_make_unboxing).toBe(false);
  });

  it("finds required product fields before content creation", () => {
    const missing = getMissingProductFields(
      { ...raw, sku: "", source_name: "", source_price: null, image_url_1: "" },
      { product_type: "", available_assets: [] }
    );
    expect(missing).toEqual([
      "sku",
      "title_or_source_name",
      "price",
      "image_or_available_assets",
      "product_type"
    ]);
  });
});
