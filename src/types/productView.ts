export interface ProductView {
  productId: string;
  sku: string;
  name: string;
  sourceName: string;
  category: string;
  productType: string;
  price: number | null;
  costPrice: number | null;
  stock: number | null;
  status: string;
  riskLevel: "low" | "medium" | "high";
  riskNote: string;
  isNewArrival: boolean;
  isBlindBox: boolean;
  isPreorder: boolean;
  imageUrl: string;
  driveAssetStatus: "ready" | "folder_found" | "missing_folder" | "missing_image" | "not_configured" | "demo";
  driveAssetLabel: string;
  driveAssetSource: "sheet" | "drive" | "fallback" | "demo";
  driveFolderId: string;
  driveFolderUrl: string;
  driveAssetCount: number;
  driveImageCount: number;
  trendLevel: "none" | "low" | "medium" | "high";
  trendLabels: string[];
  trendScore: number;
  trendNote: string;
  availableAssets: string[];
  assetNote: string;
  canMakeUnboxing: boolean;
  canMakeReview: boolean;
  canMakeProductShowcase: boolean;
  missingFields: string[];
  contentEligible: boolean;
  publishPriority: number;
  salesLast7d: number;
  salesLast30d: number;
  revenueLast30d: number;
  lastSoldAt: string;
  salesStatus: "top_seller" | "restock_risk" | "one_off_sold_signal" | "steady" | "slow_mover" | "no_recent_sales";
  salesLabels: string[];
  salesSummary: string;
  salesRecommendedAction: string;
  updatedAt: string;
}

export interface ProductListResponse {
  mode: "live" | "demo";
  summary: {
    total: number;
    newArrivals: number;
    needsCheck: number;
    ready: number;
    highRisk: number;
  };
  products: ProductView[];
}
