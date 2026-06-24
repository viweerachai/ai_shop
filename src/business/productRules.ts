import { ProcessedProduct, RawProduct } from "../types/product.js";

export function getMissingProductFields(
  raw: RawProduct,
  analysis: { product_type: string; available_assets: string[] }
): string[] {
  const missing: string[] = [];
  if (!raw.sku.trim()) missing.push("sku");
  if (!raw.source_name.trim()) missing.push("title_or_source_name");
  if (raw.selling_price === null && raw.source_price === null) missing.push("price");
  if (!raw.image_url_1.trim() && analysis.available_assets.length === 0) {
    missing.push("image_or_available_assets");
  }
  if (!analysis.product_type.trim()) missing.push("product_type");
  return missing;
}

export function enforceAssetRules<T extends {
  available_assets: string[];
  can_make_unboxing: boolean;
  can_make_review: boolean;
}>(analysis: T): T {
  const normalized = analysis.available_assets.map((asset) => asset.toLowerCase());
  const boxOnly =
    normalized.length > 0 &&
    normalized.every((asset) => asset.includes("box_photo") || asset.includes("sealed"));
  return {
    ...analysis,
    can_make_unboxing: false,
    can_make_review: analysis.can_make_review && !boxOnly
  };
}

export function productCanCreateContent(product: ProcessedProduct): boolean {
  return product.status === "product_ready" && product.risk_level !== "high";
}
