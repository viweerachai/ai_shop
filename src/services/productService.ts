import { getMissingProductFields, productCanCreateContent } from "../business/productRules.js";
import { deriveProductSalesSignals } from "../business/salesOpportunityRules.js";
import { createSalesAnalytics, ProductSalesSummary, salesSummaryForSku } from "../business/salesAnalytics.js";
import { config } from "../config.js";
import { createRepos } from "../sheets/repos.js";
import { ProcessedProduct, RawProduct } from "../types/product.js";
import { ProductListResponse, ProductView } from "../types/productView.js";
import { ProductAssetView } from "../types/productAsset.js";
import { TrendSignal } from "../types/trendSignal.js";
import { trendInsightForProduct } from "../business/trendSignals.js";
import { salesSourceLabel } from "./dataImportService.js";
import { getDemoProducts } from "./demoProducts.js";
import { liveOrDemo } from "./liveOrDemo.js";
import { loadProductAssetMap, productAssetImageUrl } from "./productAssetService.js";

function splitAssets(value: string): string[] {
  return value.split(",").map((asset) => asset.trim()).filter(Boolean);
}

function normalizedRisk(value: string): "low" | "medium" | "high" {
  return value === "high" || value === "medium" ? value : "low";
}

function driveImageCount(asset?: ProductAssetView): number {
  return asset?.files.filter((file) => file.mimeType.toLowerCase().startsWith("image/")).length ?? 0;
}

function driveAssetStatus(asset?: ProductAssetView): Pick<ProductView,
  "driveAssetStatus" |
  "driveAssetLabel" |
  "driveAssetSource" |
  "driveFolderId" |
  "driveFolderUrl" |
  "driveAssetCount" |
  "driveImageCount"
> {
  const imageCount = driveImageCount(asset);
  if (!config.googleDriveFolderId) {
    return {
      driveAssetStatus: "not_configured",
      driveAssetLabel: "ยังไม่ตั้ง Drive",
      driveAssetSource: "fallback",
      driveFolderId: "",
      driveFolderUrl: "",
      driveAssetCount: 0,
      driveImageCount: 0
    };
  }
  if (!asset?.driveFolderId) {
    return {
      driveAssetStatus: "missing_folder",
      driveAssetLabel: "ไม่พบโฟลเดอร์",
      driveAssetSource: "fallback",
      driveFolderId: "",
      driveFolderUrl: "",
      driveAssetCount: 0,
      driveImageCount: 0
    };
  }
  if (imageCount === 0) {
    return {
      driveAssetStatus: asset.assetCount > 0 ? "missing_image" : "folder_found",
      driveAssetLabel: asset.assetCount > 0 ? "ไม่มีรูป" : "โฟลเดอร์ว่าง",
      driveAssetSource: asset.source,
      driveFolderId: asset.driveFolderId,
      driveFolderUrl: asset.driveFolderUrl,
      driveAssetCount: asset.assetCount,
      driveImageCount: imageCount
    };
  }
  return {
    driveAssetStatus: "ready",
    driveAssetLabel: `Drive OK (${imageCount})`,
    driveAssetSource: asset.source,
    driveFolderId: asset.driveFolderId,
    driveFolderUrl: asset.driveFolderUrl,
    driveAssetCount: asset.assetCount,
    driveImageCount: imageCount
  };
}

export function createProductView(raw: RawProduct, processed?: ProcessedProduct): ProductView {
  return createProductViewWithSales(raw, processed);
}

export function createProductViewWithSales(
  raw: RawProduct,
  processed?: ProcessedProduct,
  sales?: ProductSalesSummary,
  trends: TrendSignal[] = []
): ProductView {
  const availableAssets = splitAssets(processed?.available_assets ?? "");
  const missingFields = processed
    ? getMissingProductFields(raw, {
        product_type: processed.product_type,
        available_assets: availableAssets
      })
    : ["product_check_not_run"];
  const status = processed?.status || raw.status || "new";
  const salesSignals = deriveProductSalesSignals({
    stock: processed?.stock ?? raw.stock,
    isNewArrival: processed?.is_new_arrival ?? false
  }, sales);
  const trend = processed ? trendInsightForProduct(processed, trends) : null;
  return {
    productId: raw.product_id,
    sku: raw.sku,
    name: processed?.title_th || raw.source_name || "ยังไม่มีชื่อสินค้า",
    sourceName: raw.source_name,
    category: processed?.category || raw.source_category,
    productType: processed?.product_type || "",
    price: processed?.selling_price ?? raw.selling_price ?? raw.source_price,
    costPrice: processed?.cost_price ?? raw.cost_price,
    stock: processed?.stock ?? raw.stock,
    status,
    riskLevel: normalizedRisk(processed?.risk_level ?? "low"),
    riskNote: processed?.risk_note ?? "",
    isNewArrival: processed?.is_new_arrival ?? false,
    isBlindBox: processed?.is_blind_box ?? false,
    isPreorder: processed?.is_preorder ?? false,
    imageUrl: raw.image_url_1,
    driveAssetStatus: config.googleDriveFolderId ? "missing_folder" : "not_configured",
    driveAssetLabel: config.googleDriveFolderId ? "ไม่พบโฟลเดอร์" : "ยังไม่ตั้ง Drive",
    driveAssetSource: "fallback",
    driveFolderId: "",
    driveFolderUrl: "",
    driveAssetCount: 0,
    driveImageCount: 0,
    trendLevel: trend?.level ?? "none",
    trendLabels: trend?.labels ?? [],
    trendScore: trend?.score ?? 0,
    trendNote: trend?.notes.join(" | ") ?? "",
    availableAssets,
    assetNote: processed?.asset_note ?? "",
    canMakeUnboxing: processed?.can_make_unboxing ?? false,
    canMakeReview: processed?.can_make_review ?? false,
    canMakeProductShowcase: processed?.can_make_product_showcase ?? false,
    missingFields,
    contentEligible: processed ? productCanCreateContent(processed) && missingFields.length === 0 : false,
    publishPriority: processed?.publish_priority ?? 0,
    salesLast7d: sales?.units7d ?? 0,
    salesLast30d: sales?.units30d ?? 0,
    revenueLast30d: sales?.revenue30d ?? 0,
    lastSoldAt: sales?.lastOrderedAt ?? "",
    salesStatus: salesSignals.status,
    salesLabels: salesSignals.labels,
    salesSummary: salesSignals.summary,
    salesRecommendedAction: salesSignals.recommendedAction,
    updatedAt: processed?.updated_at || raw.updated_at || raw.created_at
  };
}

export async function getProducts(): Promise<ProductListResponse> {
  return liveOrDemo(loadLiveProducts, getDemoProducts, "products");
}

async function loadLiveProducts(): Promise<ProductListResponse> {
  const repos = createRepos();
  const [rawProducts, processedProducts, salesOrders, trendSignals, assetMap] = await Promise.all([
    repos.rawProducts.all(),
    repos.processedProducts.all(),
    repos.salesOrders.all(),
    repos.trendSignals.active(),
    loadProductAssetMap()
  ]);
  const processedById = new Map(processedProducts.map((product) => [product.product_id, product]));
  const sales = createSalesAnalytics(salesOrders, { sourceLabel: salesSourceLabel() });
  const products = rawProducts
    .map((raw) => {
      const processed = processedById.get(raw.product_id);
      const summary = salesSummaryForSku(sales, processed?.sku ?? raw.sku);
      const view = createProductViewWithSales(raw, processed, summary, trendSignals);
      const asset = assetMap.get(view.sku);
      const driveStatus = driveAssetStatus(asset);
      return {
        ...view,
        ...driveStatus,
        imageUrl: productAssetImageUrl(asset) || view.imageUrl
      };
    })
    .sort((a, b) =>
      b.trendScore - a.trendScore ||
      Number(b.isNewArrival) - Number(a.isNewArrival) ||
      b.salesLast30d - a.salesLast30d ||
      b.publishPriority - a.publishPriority ||
      a.name.localeCompare(b.name)
    );
  return {
    mode: "live",
    summary: {
      total: products.length,
      newArrivals: products.filter((product) => product.isNewArrival).length,
      needsCheck: products.filter((product) => product.status === "needs_product_check").length,
      ready: products.filter((product) => product.status === "product_ready").length,
      highRisk: products.filter((product) => product.riskLevel === "high").length
    },
    products
  };
}
