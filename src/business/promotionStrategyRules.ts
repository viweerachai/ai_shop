import { CeoStrategy } from "../types/agent.js";
import { ProcessedProduct } from "../types/product.js";
import { PromotionPlan } from "../types/promotion.js";
import { ProductSalesSummary } from "./salesAnalytics.js";
import { deriveProductSalesSignals } from "./salesOpportunityRules.js";

export type PromotionCampaignSignals = {
  name: string;
  productFocus: string[];
  warnings: string[];
};

export interface PromotionIntelligence {
  riskLevel: "low" | "medium" | "high";
  stockStatus: "out" | "low" | "healthy" | "high";
  stockLabel: string;
  stockUnits: number | null;
  marginPercent: number | null;
  routeLabel: string;
  approvalReadiness: "ready" | "needs_review" | "blocked";
  strategyLabels: string[];
  decisionSummary: string;
  watchouts: string[];
}

function mapRouteLabel(promoType: string): string {
  switch (promoType) {
    case "discount":
      return "Direct discount";
    case "bundle":
      return "Bundle pair";
    case "addon":
      return "Add-on upsell";
    case "freegift":
      return "Free gift";
    case "clearance":
      return "Clearance push";
    case "limited_campaign":
      return "Limited campaign";
    default:
      return promoType || "Promotion";
  }
}

function dedupe(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}

export function derivePromotionIntelligence(
  promotion: Pick<
    PromotionPlan,
    | "promo_type"
    | "discount_type"
    | "discount_value"
    | "related_product_sku"
    | "risk_note"
    | "manager_note"
  >,
  product?: Pick<
    ProcessedProduct,
    | "sku"
    | "stock"
    | "margin_percent"
    | "cost_price"
    | "publish_priority"
    | "is_new_arrival"
    | "is_preorder"
    | "risk_level"
    | "risk_note"
  >,
  options?: {
    strategy?: Pick<CeoStrategy, "priority_products"> | null;
    campaign?: PromotionCampaignSignals | null;
    sales?: Pick<ProductSalesSummary, "units7d" | "units30d" | "revenue30d" | "orders30d"> | null;
    approvalAllowed?: boolean;
    approvalReason?: string;
  }
): PromotionIntelligence {
  const stockUnits = product?.stock ?? null;
  const stockStatus =
    stockUnits === null ? "healthy" :
    stockUnits <= 0 ? "out" :
    stockUnits <= 5 ? "low" :
    stockUnits >= 12 ? "high" :
    "healthy";
  const stockLabel =
    stockUnits === null ? "ไม่ทราบ" :
    stockStatus === "out" ? "หมดสต็อก" :
    stockStatus === "low" ? `ต่ำ (${stockUnits})` :
    stockStatus === "high" ? `ดันได้ (${stockUnits})` :
    `พร้อมขาย (${stockUnits})`;
  const hasMarginData = Boolean(product && product.cost_price !== null && product.margin_percent !== null);
  const isDirectDiscount =
    promotion.promo_type === "discount" ||
    Boolean(promotion.discount_type) ||
    Boolean(promotion.discount_value);
  const isCeoPriority = Boolean(
    product?.sku &&
    options?.strategy?.priority_products?.includes(product.sku)
  );
  const isCampaignFocus = Boolean(
    product?.sku &&
    options?.campaign?.productFocus?.includes(product.sku)
  );
  const isPreorder = Boolean(product?.is_preorder);
  const isHighRiskProduct = product?.risk_level === "high";
  const isMediumRiskProduct = product?.risk_level === "medium";
  const blocked = options?.approvalAllowed === false;
  const salesSignals = deriveProductSalesSignals({
    stock: product?.stock ?? null,
    isNewArrival: product?.is_new_arrival ?? false
  }, options?.sales ?? undefined);

  const riskLevel =
    blocked || isHighRiskProduct || stockStatus === "out" ? "high" :
    isMediumRiskProduct || isPreorder || stockStatus === "low" || salesSignals.status === "restock_risk" || !hasMarginData || Boolean(promotion.risk_note) ? "medium" :
    "low";
  const approvalReadiness =
    blocked ? "blocked" :
    riskLevel === "low" && !promotion.manager_note ? "ready" :
    "needs_review";

  const strategyLabels = dedupe([
    isCeoPriority ? "CEO priority" : "",
    isCampaignFocus ? "Campaign focus" : "",
    product?.is_new_arrival ? "New arrival" : "",
    stockStatus === "low" ? "Low stock" : "",
    stockStatus === "high" ? "Stock push" : "",
    ...salesSignals.labels,
    hasMarginData ? "Margin ready" : "Margin missing",
    isPreorder ? "Preorder guardrail" : "",
    isHighRiskProduct ? "High risk" : ""
  ]);

  const decisionSummary = dedupe([
    isCeoPriority && isCampaignFocus
      ? "AI เลือกสินค้านี้ตามทั้ง CEO priority และ campaign focus"
      : isCeoPriority
      ? "AI เลือกสินค้านี้ตาม CEO priority"
      : isCampaignFocus
      ? `AI เลือกสินค้านี้ตามแคมเปญ ${options?.campaign?.name || "ล่าสุด"}`
      : (product?.publish_priority ?? 0) > 0
      ? "AI เลือกสินค้านี้จากคะแนนความพร้อมของสินค้า"
      : "AI เลือกจากข้อมูลสินค้าและกฎร้าน",
    stockStatus === "out"
      ? "สินค้าหมดสต็อก จึงไม่ควรปล่อยโปรจนกว่าจะเติมของ"
      : stockStatus === "low"
      ? `สต็อกเหลือ ${stockUnits} ชิ้น จึงควรดันแบบจำกัดช่วงและระวัง oversell`
      : stockStatus === "high"
      ? `สต็อก ${stockUnits} ชิ้น รองรับการเร่งยอดด้วยโปรได้`
      : stockUnits !== null
      ? `สต็อก ${stockUnits} ชิ้น ยังรองรับการทำโปรได้`
      : "ยังไม่มีข้อมูล stock ที่ชัดเจน",
    isDirectDiscount && !hasMarginData
      ? "ไม่มี cost หรือ margin data จึงไม่ควรใช้ส่วนลดตรง"
      : isDirectDiscount && product?.margin_percent !== null && product?.margin_percent !== undefined
      ? `มี margin ${product.margin_percent}% รองรับการประเมินส่วนลด`
      : !hasMarginData
      ? "ไม่มี margin data ครบ จึงเหมาะกับ bundle หรือของแถมมากกว่า"
      : product?.margin_percent !== null && product?.margin_percent !== undefined
      ? `มี margin ${product.margin_percent}% ใช้ช่วยคุมความเสี่ยงโปรได้`
      : "",
    salesSignals.summary,
    isPreorder ? "เป็นพรีออเดอร์ ต้องสื่อสารเงื่อนไขและวันส่งมอบให้ชัด" : "",
    isHighRiskProduct ? "สินค้านี้ยังมีความเสี่ยงสูง ต้องให้เจ้าของร้านตรวจละเอียด" : ""
  ]).slice(0, 3).join(" • ");

  const watchouts = dedupe([
    options?.approvalReason ?? "",
    promotion.risk_note,
    riskLevel !== "low" ? product?.risk_note ?? "" : "",
    isPreorder ? "เป็นพรีออเดอร์ ต้องระบุวันส่งมอบและเงื่อนไขยกเลิกให้ชัด" : "",
    stockStatus === "low" ? "สต็อกต่ำ ควรจำกัดจำนวนหรือช่วงเวลาโปร" : "",
    salesSignals.status === "restock_risk" ? "ขายดีแต่ stock เริ่มตึง อย่าดันโปรแรงเกินไป" : "",
    salesSignals.status === "slow_mover" ? "ยอดขายยังช้า เหมาะกับ bundle, add-on หรือของแถมมากกว่าส่วนลดตรง" : "",
    salesSignals.status === "no_recent_sales" ? "ยังไม่มียอดขายล่าสุด ควรทดสอบคอนเทนต์หรือ hook ก่อนเร่งโปร" : "",
    stockStatus === "out" ? "สินค้าหมดสต็อก ห้ามเปิดโปรจนกว่าจะเติมสินค้า" : "",
    !hasMarginData ? "ยังไม่มีข้อมูลต้นทุนหรือ margin ครบถ้วน" : "",
    approvalReadiness === "needs_review" && promotion.manager_note ? promotion.manager_note : ""
  ]);

  return {
    riskLevel,
    stockStatus,
    stockLabel,
    stockUnits,
    marginPercent: product?.margin_percent ?? null,
    routeLabel: mapRouteLabel(promotion.promo_type),
    approvalReadiness,
    strategyLabels,
    decisionSummary,
    watchouts
  };
}
