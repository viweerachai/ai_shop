import { deriveProductSalesSignals } from "../business/salesOpportunityRules.js";
import { ProductListResponse, ProductView } from "../types/productView.js";

type DemoProductSeed = Omit<
  ProductView,
  "salesStatus" |
  "salesLabels" |
  "salesSummary" |
  "salesRecommendedAction" |
  "driveFolderId" |
  "driveFolderUrl" |
  "driveAssetStatus" |
  "driveAssetLabel" |
  "driveAssetSource" |
  "driveAssetCount" |
  "driveImageCount" |
  "trendLevel" |
  "trendLabels" |
  "trendScore" |
  "trendNote"
>;

function withSalesSignals(product: DemoProductSeed): ProductView {
  const signals = deriveProductSalesSignals(
    { stock: product.stock, isNewArrival: product.isNewArrival },
    {
      units7d: product.salesLast7d,
      units30d: product.salesLast30d,
      revenue30d: product.revenueLast30d,
      orders30d: 0,
    }
  );

  return {
    ...product,
    driveAssetStatus: "demo",
    driveAssetLabel: "Demo asset",
    driveAssetSource: "demo",
    driveFolderId: "",
    driveFolderUrl: "",
    driveAssetCount: product.availableAssets.length,
    driveImageCount: product.availableAssets.includes("product_photo") ? 1 : 0,
    trendLevel: product.isNewArrival ? "medium" : "none",
    trendLabels: product.isNewArrival ? ["Demo trend"] : [],
    trendScore: product.isNewArrival ? 30 : 0,
    trendNote: product.isNewArrival ? "Demo: กระแสสินค้าเข้าใหม่" : "",
    salesStatus: signals.status,
    salesLabels: signals.labels,
    salesSummary: signals.summary,
    salesRecommendedAction: signals.recommendedAction
  };
}

const demoProducts: ProductView[] = ([
  {
    productId: "demo-001",
    sku: "SA-ANIMAL-V4",
    name: "Sonny Angel Animal Series Version 4",
    sourceName: "Sonny Angel Animal Series Version 4",
    category: "Blind Box",
    productType: "blind_box",
    price: 590,
    costPrice: 380,
    stock: 18,
    status: "product_ready",
    riskLevel: "low",
    riskNote: "",
    isNewArrival: true,
    isBlindBox: true,
    isPreorder: false,
    imageUrl: "",
    availableAssets: ["product_photo", "box_photo"],
    assetNote: "มีภาพกล่องและภาพสินค้าจริง ยังไม่มีภาพแกะกล่อง",
    canMakeUnboxing: false,
    canMakeReview: false,
    canMakeProductShowcase: true,
    missingFields: [],
    contentEligible: true,
    publishPriority: 96,
    salesLast7d: 6,
    salesLast30d: 14,
    revenueLast30d: 8260,
    lastSoldAt: "2026-06-16T12:30:00.000Z",
    updatedAt: new Date().toISOString()
  },
  {
    productId: "demo-002",
    sku: "OP-CHOPPER-01",
    name: "One Piece Figure - Tony Tony Chopper",
    sourceName: "Tony Tony Chopper Figure",
    category: "Figure",
    productType: "figure",
    price: 1290,
    costPrice: 820,
    stock: 7,
    status: "product_ready",
    riskLevel: "low",
    riskNote: "",
    isNewArrival: true,
    isBlindBox: false,
    isPreorder: false,
    imageUrl: "",
    availableAssets: ["product_photo", "opened_photo", "video"],
    assetNote: "มีภาพสินค้าจริง ภาพแกะกล่อง และวิดีโอหมุนสินค้า",
    canMakeUnboxing: true,
    canMakeReview: true,
    canMakeProductShowcase: true,
    missingFields: [],
    contentEligible: true,
    publishPriority: 91,
    salesLast7d: 4,
    salesLast30d: 11,
    revenueLast30d: 14190,
    lastSoldAt: "2026-06-16T18:10:00.000Z",
    updatedAt: new Date().toISOString()
  },
  {
    productId: "demo-003",
    sku: "MOLLY-SPACE-01",
    name: "Molly Space Adventure",
    sourceName: "Molly Space Adventure",
    category: "Art Toy",
    productType: "collectible_figure",
    price: 1590,
    costPrice: null,
    stock: 3,
    status: "needs_product_check",
    riskLevel: "medium",
    riskNote: "ยังไม่มีข้อมูลต้นทุน",
    isNewArrival: false,
    isBlindBox: false,
    isPreorder: false,
    imageUrl: "",
    availableAssets: ["box_photo"],
    assetNote: "มีเฉพาะภาพกล่องปิด",
    canMakeUnboxing: false,
    canMakeReview: false,
    canMakeProductShowcase: true,
    missingFields: ["cost_price"],
    contentEligible: false,
    publishPriority: 55,
    salesLast7d: 1,
    salesLast30d: 5,
    revenueLast30d: 7950,
    lastSoldAt: "2026-06-11T10:40:00.000Z",
    updatedAt: new Date().toISOString()
  },
  {
    productId: "demo-004",
    sku: "DIMOO-PRE-02",
    name: "DIMOO Weaving Wonders Series",
    sourceName: "DIMOO Weaving Wonders Preorder",
    category: "Blind Box",
    productType: "blind_box",
    price: 650,
    costPrice: 420,
    stock: 0,
    status: "product_text_ready_for_qa",
    riskLevel: "medium",
    riskNote: "ต้องระบุเงื่อนไขพรีออเดอร์และการยกเลิก",
    isNewArrival: true,
    isBlindBox: true,
    isPreorder: true,
    imageUrl: "",
    availableAssets: ["product_photo", "template"],
    assetNote: "ภาพประชาสัมพันธ์จากแบรนด์และเทมเพลตร้าน",
    canMakeUnboxing: false,
    canMakeReview: false,
    canMakeProductShowcase: true,
    missingFields: [],
    contentEligible: false,
    publishPriority: 88,
    salesLast7d: 0,
    salesLast30d: 2,
    revenueLast30d: 1300,
    lastSoldAt: "2026-05-28T09:20:00.000Z",
    updatedAt: new Date().toISOString()
  },
  {
    productId: "demo-005",
    sku: "LABUBU-MAC-01",
    name: "Labubu Macaron Blind Box",
    sourceName: "Labubu Exciting Macaron",
    category: "Blind Box",
    productType: "blind_box",
    price: 790,
    costPrice: 510,
    stock: 22,
    status: "needs_product_rewrite",
    riskLevel: "high",
    riskNote: "ข้อความเดิมสื่อว่าสามารถเลือกลายได้",
    isNewArrival: false,
    isBlindBox: true,
    isPreorder: false,
    imageUrl: "",
    availableAssets: ["product_photo"],
    assetNote: "ใช้ภาพสินค้าจริงเท่านั้น",
    canMakeUnboxing: false,
    canMakeReview: false,
    canMakeProductShowcase: true,
    missingFields: [],
    contentEligible: false,
    publishPriority: 74,
    salesLast7d: 2,
    salesLast30d: 9,
    revenueLast30d: 7110,
    lastSoldAt: "2026-06-15T20:05:00.000Z",
    updatedAt: new Date().toISOString()
  },
  {
    productId: "demo-006",
    sku: "GHIBLI-TOTORO-01",
    name: "Totoro Mini Figure Set",
    sourceName: "My Neighbor Totoro Figure Set",
    category: "Figure",
    productType: "figure_set",
    price: 1890,
    costPrice: 1230,
    stock: 5,
    status: "product_ready",
    riskLevel: "low",
    riskNote: "",
    isNewArrival: false,
    isBlindBox: false,
    isPreorder: false,
    imageUrl: "",
    availableAssets: ["product_photo", "template"],
    assetNote: "ภาพสินค้าจริง 3 มุม",
    canMakeUnboxing: false,
    canMakeReview: true,
    canMakeProductShowcase: true,
    missingFields: [],
    contentEligible: true,
    publishPriority: 68,
    salesLast7d: 3,
    salesLast30d: 8,
    revenueLast30d: 15120,
    lastSoldAt: "2026-06-14T15:00:00.000Z",
    updatedAt: new Date().toISOString()
  }
] satisfies DemoProductSeed[]).map(withSalesSignals);

export function getDemoProducts(): ProductListResponse {
  return {
    mode: "demo",
    summary: {
      total: demoProducts.length,
      newArrivals: demoProducts.filter((product) => product.isNewArrival).length,
      needsCheck: demoProducts.filter((product) => product.status === "needs_product_check").length,
      ready: demoProducts.filter((product) => product.status === "product_ready").length,
      highRisk: demoProducts.filter((product) => product.riskLevel === "high").length
    },
    products: demoProducts
  };
}
