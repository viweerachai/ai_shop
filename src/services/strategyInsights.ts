import { WorkflowRun } from "../runtime/workflowRunStore.js";
import { SalesAnalyticsSnapshot, salesSummaryForSku } from "../business/salesAnalytics.js";
import { deriveProductSalesSignals } from "../business/salesOpportunityRules.js";
import { summarizeTrendSignals, trendInsightForProduct } from "../business/trendSignals.js";
import { CeoStrategy } from "../types/agent.js";
import { ContentPlan } from "../types/content.js";
import { ProcessedProduct } from "../types/product.js";
import { PromotionPlan } from "../types/promotion.js";
import { StrategyAction } from "../types/strategyAction.js";
import { TrendSignal } from "../types/trendSignal.js";

export type PriorityProductInsight = {
  sku: string;
  name: string;
  reason: string;
  stock: number | null;
  riskLevel: "low" | "medium" | "high";
  score: number;
  salesLast7d: number;
  salesLast30d: number;
  revenueLast30d: number;
};

export type StrategyBrief = {
  shopPriority: string;
  weeklyDirection: string;
  marketingInstruction: string;
  managerInstruction: string;
  recommendation: string;
  priorityProducts: PriorityProductInsight[];
  drivers: string[];
  watchouts: string[];
  nextMoves: string[];
  actions: StrategyAction[];
};

function stockUnits(value: number | null): number {
  return value ?? 0;
}

function hasUsableAssets(product: ProcessedProduct): boolean {
  return Boolean(product.can_make_review || product.can_make_unboxing || product.can_make_product_showcase);
}

function isOneOffStock(product: ProcessedProduct): boolean {
  const stock = stockUnits(product.stock);
  return stock > 0 && stock <= 2;
}

function asCeoStrategy(value: unknown): CeoStrategy | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<CeoStrategy>;
  if (!raw.shop_priority || !raw.weekly_direction) return null;
  return {
    shop_priority: raw.shop_priority,
    priority_products: Array.isArray(raw.priority_products) ? raw.priority_products : [],
    focus_categories: Array.isArray(raw.focus_categories) ? raw.focus_categories : [],
    weekly_direction: raw.weekly_direction,
    instruction_to_marketing: raw.instruction_to_marketing ?? "",
    instruction_to_manager: raw.instruction_to_manager ?? ""
  };
}

export function latestCeoStrategy(runs: WorkflowRun[]): CeoStrategy | null {
  const run = runs.find((item) => item.workflowName === "ceo:daily" && item.status === "completed");
  return asCeoStrategy(run?.result);
}

export function buildStrategyBrief(
  products: ProcessedProduct[],
  content: ContentPlan[],
  promotions: PromotionPlan[],
  strategy: CeoStrategy | null,
  sales?: SalesAnalyticsSnapshot,
  trendSignals: TrendSignal[] = []
): StrategyBrief {
  const ownerQueue = content.filter((item) => item.status === "owner_review_required").length;
  const qaQueue = content.filter((item) => item.status === "content_ready_for_qa").length;
  const rewriteQueue = content.filter((item) => item.status === "needs_rewrite").length;
  const promotionQueue = promotions.filter((item) => item.status === "suggested");
  const newArrivals = products.filter((item) => item.is_new_arrival);
  const highRiskProducts = products.filter((item) => item.risk_level === "high");
  const stockPressure = products.filter((item) => (item.stock ?? 0) > 0 && (item.stock ?? 0) <= 5);
  const strategySkuSet = new Set(strategy?.priority_products ?? []);
  const strategyCategorySet = new Set((strategy?.focus_categories ?? []).map((item) => item.toLowerCase()));

  const topSeller = sales?.topProducts[0];
  const priorityProducts = products
    .map((product) => {
      let score = Number(product.publish_priority ?? 0);
      const reasons: string[] = [];
      const salesSummary = sales ? salesSummaryForSku(sales, product.sku) : undefined;
      const salesSignals = deriveProductSalesSignals({
        stock: product.stock,
        isNewArrival: product.is_new_arrival
      }, salesSummary);
      const trend = trendInsightForProduct(product, trendSignals);

      if (trend.score > 0) {
        score += trend.score;
        reasons.push(`กระแสช่วงนี้ ${trend.labels[0] ?? trend.level}`);
      }

      if (strategySkuSet.has(product.sku)) {
        score += 45;
        reasons.push("CEO เลือกเป็นสินค้าหลัก");
      }
      if (strategyCategorySet.has(product.category.toLowerCase())) {
        score += 18;
        reasons.push("อยู่ในหมวดที่ CEO โฟกัส");
      }
      if (product.is_new_arrival) {
        score += 34;
        reasons.push("เป็นสินค้าเข้าใหม่");
      }
      if (product.status === "product_ready") {
        score += 28;
        reasons.push("ข้อมูลพร้อมทำตลาด");
      } else {
        score -= 34;
      }
      if (isOneOffStock(product)) {
        score += 22;
        reasons.push("มีของพร้อมขายแบบชิ้นเดียว/จำนวนน้อย");
      } else if ((product.stock ?? 0) > 2 && (product.stock ?? 0) <= 5) {
        score += 20;
        reasons.push("สต็อกจำกัด เหมาะกับ showcase แบบระวัง");
      } else if ((product.stock ?? 0) > 5) {
        score += 12;
        reasons.push("มีสต็อกรองรับการดันโพสต์");
      } else {
        score -= 60;
      }
      if (hasUsableAssets(product)) {
        score += 24;
        reasons.push("มี asset พอสำหรับคอนเทนต์");
      }
      if (product.content_used_count === 0) {
        score += 16;
        reasons.push("ยังไม่ถูกใช้ในคอนเทนต์");
      }
      if ((salesSummary?.units7d ?? 0) >= 3) {
        score += isOneOffStock(product) ? 4 : 10;
        reasons.push(`มีสัญญาณยอดขาย ${salesSummary?.units7d} ชิ้นใน 7 วัน`);
      } else if ((salesSummary?.units30d ?? 0) > 0) {
        score += isOneOffStock(product) ? 2 : 6;
        reasons.push(`มียอดขายประกอบ ${salesSummary?.units30d} ชิ้นใน 30 วัน`);
      } else if ((product.stock ?? 0) > 5) {
        score -= 2;
        reasons.push("สต็อกมี แต่ยังไม่มียอดขายล่าสุด");
      }
      if (product.risk_level === "high") {
        score -= 54;
        reasons.push("ความเสี่ยงสูง");
      } else if (product.risk_level === "medium") {
        score -= 22;
        reasons.push("ยังมีเงื่อนไขต้องระวัง");
      }
      if (product.is_preorder) {
        score -= 8;
        reasons.push("เป็นพรีออเดอร์ ต้องสื่อสารเงื่อนไข");
      }
      if (salesSignals.status === "top_seller") {
        score += 8;
        reasons.push("มีสัญญาณขายดี");
      }
      if (salesSignals.status === "restock_risk") {
        score += 3;
        reasons.push("ขายดีแต่ stock เริ่มตึง");
      }
      if (salesSignals.status === "one_off_sold_signal") {
        score += 2;
        reasons.push("ยอดขายเป็นสัญญาณรองเพราะ stock น้อย");
      }
      if (salesSignals.status === "slow_mover") {
        score += 6;
        reasons.push("ควรใช้โปรหรือคอนเทนต์ช่วยเร่งรอบขาย");
      }
      if (salesSignals.status === "no_recent_sales") {
        score += isOneOffStock(product) ? 6 : -4;
        reasons.push(isOneOffStock(product) ? "ยังไม่เคยขายแต่มีของพร้อมขาย" : "ยังไม่มียอดขายล่าสุด");
      }

      return {
        sku: product.sku,
        name: product.title_th || product.sku,
        reason: reasons.slice(0, 3).join(" • "),
        stock: product.stock,
        riskLevel: product.risk_level as "low" | "medium" | "high",
        score,
        salesLast7d: salesSummary?.units7d ?? 0,
        salesLast30d: salesSummary?.units30d ?? 0,
        revenueLast30d: salesSummary?.revenue30d ?? 0
      };
    })
    .filter((item) => item.score > -10)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const fallbackRecommendation = priorityProducts[0]
    ? `ดัน ${priorityProducts[0].name} ก่อน พร้อมบาลานซ์คิวคอนเทนต์ โปรโมชั่น และสต็อก`
    : "จัดคิวงานตามสินค้าที่พร้อมขายและความเสี่ยงที่ต้องปิดก่อน";

  const shopPriority = strategy?.shop_priority
    || (trendSignals.length
      ? `ดันสินค้าที่ตรงกระแสช่วงนี้ก่อน แล้วคัดด้วย stock/asset/risk`
      : newArrivals.length
      ? `สินค้าเข้าใหม่ ${newArrivals.length} รายการต้องขึ้นนำก่อน โดยดู stock/asset/risk เป็นหลัก`
      : priorityProducts[0]
      ? `ดัน ${priorityProducts[0].sku} เพราะพร้อมขายและ asset พร้อม ไม่ใช่เพราะยอดขายอย่างเดียว`
      : topSeller
      ? `ใช้ยอดขายของ ${topSeller.productName} เป็นสัญญาณรองเท่านั้น`
      : "เร่งใช้สินค้าที่พร้อมขายและยังไม่ถูกใช้ในคอนเทนต์");
  const weeklyDirection = strategy?.weekly_direction
    || (trendSignals.length
      ? "ใช้ trend signal เป็นตัวนำ แล้วเลือกเฉพาะสินค้าที่พร้อมขาย รูปพร้อม และความเสี่ยงไม่สูง"
      : stockPressure.length
      ? "เน้นสินค้าพร้อมขายที่สต็อกจำกัดและมี asset ครบ"
      : topSeller
      ? "ใช้ stock, asset, margin, risk และความสดของคอนเทนต์เป็นหลัก ยอดขายเป็น signal รอง"
      : "สร้างแคมเปญจากสินค้าพร้อมขายและลดคิวค้างอนุมัติ");
  const marketingInstruction = strategy?.instruction_to_marketing
    || (priorityProducts[0] ? `วางแคมเปญรอบนี้โดยใช้ ${priorityProducts[0].sku} เป็น anchor product` : "เลือกสินค้าที่พร้อมขายที่สุดเป็นแกนของแคมเปญ");
  const managerInstruction = strategy?.instruction_to_manager
    || (ownerQueue > 0 ? `เคลียร์คิว owner approval ${ownerQueue} รายการก่อนดันโพสต์ใหม่` : "ตรวจ risk note ของสินค้าและโปรโมชั่นก่อนอนุมัติ");

  const drivers = [
    "โมเดลร้านเป็นของสะสม/ซื้อมาขายไป: stock, asset, margin และ risk มาก่อนยอดขาย",
    ...summarizeTrendSignals(trendSignals).slice(0, 3).map((trend) => `Trend: ${trend}`),
    sales ? `${sales.totalOrders30d} ออเดอร์ใน 30 วันล่าสุด ใช้เป็นสัญญาณรอง` : "",
    `${newArrivals.length} สินค้าเข้าใหม่ที่พร้อมหรือใกล้พร้อมขาย`,
    `${promotionQueue.length} โปรโมชั่นยังรอการอนุมัติ`,
    `${ownerQueue} คอนเทนต์อยู่ในคิว owner approval`,
    `${qaQueue + rewriteQueue} งาน content / QA ยังต้องเคลียร์`
  ].filter((item) => !item.startsWith("0 "));

  const watchouts = [
    ...products
      .map((product) => {
        const salesSummary = sales ? salesSummaryForSku(sales, product.sku) : undefined;
        const signals = deriveProductSalesSignals({
          stock: product.stock,
          isNewArrival: product.is_new_arrival
        }, salesSummary);
        if (signals.status === "restock_risk") {
          return `${product.sku} ขายดีแต่เหลือ stock ${product.stock ?? 0} ชิ้น ควรเช็กเติมของ`;
        }
        if (signals.status === "slow_mover") {
          return `${product.sku} stock สูงแต่ยอดขายช้า ควรวางโปรหรือ content hook ใหม่`;
        }
        return "";
      })
      .filter(Boolean)
      .slice(0, 2),
    highRiskProducts[0] ? `สินค้าความเสี่ยงสูง ${highRiskProducts[0].sku} ยังไม่ควรดันขาย` : "",
    promotionQueue.length ? "โปรโมชั่นที่ยังไม่อนุมัติห้ามนำไปสื่อสารหน้าโพสต์" : "",
    rewriteQueue ? `มี ${rewriteQueue} คอนเทนต์ต้อง rewrite ก่อนนำกลับเข้าคิว` : "",
    products.some((item) => item.is_preorder && item.status === "product_ready") ? "โพสต์พรีออเดอร์ต้องระบุเงื่อนไขยกเลิกและรอบส่งมอบ" : ""
  ].filter(Boolean);

  const nextMoves = [
    ...priorityProducts.slice(0, 2).map((item) => {
      const product = products.find((candidate) => candidate.sku === item.sku);
      const salesSummary = product && sales ? salesSummaryForSku(sales, product.sku) : undefined;
      const signals = deriveProductSalesSignals({
        stock: product?.stock ?? null,
        isNewArrival: product?.is_new_arrival ?? false
      }, salesSummary);
      if (signals.status === "restock_risk") return `เตรียมเติม stock สำหรับ ${item.sku} ก่อนดันแคมเปญเพิ่ม`;
      if (signals.status === "slow_mover") return `ให้ Marketing ออกโปรหรือมุมสื่อสารใหม่สำหรับ ${item.sku}`;
      if (signals.status === "one_off_sold_signal") return `ดัน ${item.sku} แบบจำกัดเพราะ stock น้อย ห้ามใช้โปรแรง`;
      return "";
    }),
    priorityProducts[0] ? `ให้ Marketing แตก theme คอนเทนต์ต่อจาก ${priorityProducts[0].sku}` : "",
    priorityProducts[1] ? `วางสินค้ารอง ${priorityProducts[1].sku} สำหรับโพสต์ knowledge หรือ comparison` : "",
    ownerQueue ? `เร่ง review คอนเทนต์ค้าง ${ownerQueue} รายการเพื่อปล่อยโพสต์ได้ทันรอบ` : "",
    promotionQueue.length ? `คัดเฉพาะโปรโมชั่นที่ margin พร้อมเข้าสู่ owner approval` : ""
  ].filter(Boolean);

  const actions: StrategyAction[] = [
    ...priorityProducts.slice(0, 2).map((item, index) => ({
      id: `marketing-focus-${item.sku}`,
      title: index === 0
        ? `ดัน ${item.sku} เป็น hero content ของรอบนี้`
        : `ใช้ ${item.sku} เป็นสินค้ารองของแคมเปญ`,
      owner: "Marketing" as const,
      priority: index === 0 ? "high" as const : "medium" as const,
      status: "ready" as const,
      reason: item.reason,
      source: "sales" as const,
      sku: item.sku
    })),
    ...products
      .map((product) => {
        const salesSummary = sales ? salesSummaryForSku(sales, product.sku) : undefined;
        const signals = deriveProductSalesSignals({
          stock: product.stock,
          isNewArrival: product.is_new_arrival
        }, salesSummary);

        if (signals.status === "restock_risk") {
          return {
            id: `restock-${product.sku}`,
            title: `เช็ก stock ของ ${product.sku} ก่อนดันเพิ่ม`,
            owner: "Manager" as const,
            priority: "high" as const,
            status: "ready" as const,
            reason: signals.summary,
            source: "sales" as const,
            sku: product.sku
          };
        }

        if (signals.status === "slow_mover") {
          return {
            id: `slow-mover-${product.sku}`,
            title: `หา hook ใหม่หรือโปรเสริมสำหรับ ${product.sku}`,
            owner: "Marketing" as const,
            priority: "medium" as const,
            status: "watch" as const,
            reason: signals.recommendedAction,
            source: "sales" as const,
            sku: product.sku
          };
        }

        return null;
      })
      .filter(Boolean) as StrategyAction[],
    ownerQueue
      ? {
          id: "owner-approval-queue",
          title: `เคลียร์ owner approval ${ownerQueue} รายการ`,
          owner: "Owner" as const,
          priority: "high" as const,
          status: "blocked" as const,
          reason: "มีคอนเทนต์ที่ต้องอนุมัติก่อนถึงจะปล่อยโพสต์หรือเดิน workflow ต่อได้",
          source: "content" as const
        }
      : null,
    promotionQueue.length
      ? {
          id: "promotion-gate",
          title: `คัดโปรโมชั่นที่พร้อมจริง ${promotionQueue.length} รายการ`,
          owner: "Manager" as const,
          priority: "medium" as const,
          status: "watch" as const,
          reason: "โปรที่ยังไม่อนุมัติห้ามนำไปสื่อสารหน้าโพสต์ ต้องเช็ก margin และกฎร้านก่อน",
          source: "promotion" as const
        }
      : null,
    rewriteQueue
      ? {
          id: "rewrite-queue",
          title: `ปิดงาน rewrite ${rewriteQueue} รายการ`,
          owner: "CEO" as const,
          priority: "medium" as const,
          status: "blocked" as const,
          reason: "ถ้ายังมีงาน rewrite ค้าง จะดึง capacity ของ content และ QA ทั้งระบบ",
          source: "operations" as const
        }
      : null
  ].filter(Boolean)
    .slice(0, 6) as StrategyAction[];

  return {
    shopPriority,
    weeklyDirection,
    marketingInstruction,
    managerInstruction,
    recommendation: strategy?.shop_priority || fallbackRecommendation,
    priorityProducts,
    drivers,
    watchouts,
    nextMoves,
    actions
  };
}
