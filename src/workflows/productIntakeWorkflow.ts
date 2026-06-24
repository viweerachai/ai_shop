import { analyzeProduct } from "../agents/productSpecialistAgent.js";
import { nowIso } from "../utils/date.js";
import { logger } from "../utils/logger.js";
import { enforceAssetRules, getMissingProductFields } from "../business/productRules.js";
import { WorkflowContext } from "./context.js";

const PRODUCT_WRITER_FIELDS = new Set([
  "title_th",
  "short_description",
  "long_description",
  "keywords"
]);

function blockingMissingFields(fields: string[]): string[] {
  return fields.filter((field) => !PRODUCT_WRITER_FIELDS.has(field));
}

export async function productIntakeWorkflow({ repos, gemini }: WorkflowContext) {
  const [allRawProducts, processedProducts] = await Promise.all([
    repos.rawProducts.all(),
    repos.processedProducts.all()
  ]);
  const processedProductIds = new Set(processedProducts.map((product) => product.product_id));
  const rawProducts = allRawProducts.filter(
    (product) => !processedProductIds.has(product.product_id) || !product.status || product.status === "new"
  );
  logger.info({ count: rawProducts.length }, "Starting product intake");
  for (const raw of rawProducts) {
    const analysis = enforceAssetRules(await analyzeProduct(repos, gemini, raw));
    const missingFields = blockingMissingFields([...new Set([
      ...analysis.missing_fields,
      ...getMissingProductFields(raw, analysis)
    ])]);
    const now = nowIso();
    const cost = raw.cost_price;
    const selling = raw.selling_price ?? raw.source_price;
    const margin =
      cost !== null && selling !== null && selling > 0
        ? Number((((selling - cost) / selling) * 100).toFixed(2))
        : null;
    await repos.processedProducts.upsert([{
      product_id: raw.product_id,
      sku: raw.sku,
      title_th: raw.source_name,
      short_description: "",
      long_description: "",
      keywords: "",
      category: analysis.category,
      product_type: analysis.product_type,
      is_blind_box: analysis.is_blind_box,
      is_preorder: analysis.is_preorder,
      is_new_arrival: analysis.is_new_arrival,
      arrival_date: analysis.arrival_date,
      stock: raw.stock,
      cost_price: cost,
      selling_price: selling,
      margin_percent: margin,
      publish_priority: analysis.publish_priority,
      launch_post_needed: analysis.launch_post_needed,
      launch_post_done: false,
      available_assets: analysis.available_assets.join(", "),
      asset_note: analysis.asset_note,
      can_make_unboxing: analysis.can_make_unboxing,
      can_make_review: analysis.can_make_review,
      can_make_product_showcase: analysis.can_make_product_showcase,
      content_used_count: 0,
      last_content_date: "",
      risk_level: analysis.risk_level,
      risk_note: analysis.risk_note,
      status: missingFields.length > 0
        ? "needs_product_check"
        : analysis.risk_level === "high"
          ? "needs_product_check"
          : "needs_product_text",
      created_at: raw.created_at || now,
      updated_at: now
    }]);
    await repos.rawProducts.upsert([{
      ...raw,
      status: missingFields.length ? "needs_product_check" : "processed",
      updated_at: now
    }]);
  }
  return { processed: rawProducts.length };
}
