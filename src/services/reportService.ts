import { config } from "../config.js";
import { createDailyReport } from "../agents/reportAgent.js";
import { createSalesAnalytics } from "../business/salesAnalytics.js";
import { deriveProductSalesSignals } from "../business/salesOpportunityRules.js";
import { ContentPlan } from "../types/content.js";
import { ProcessedProduct } from "../types/product.js";
import { PromotionPlan } from "../types/promotion.js";
import { SalesOrder } from "../types/salesOrder.js";
import {
  ReportMetric,
  ReportRecommendation,
  ReportRiskItem,
  ReportView,
  ReportWorkflowItem
} from "../types/reportView.js";
import { createRepos } from "../sheets/repos.js";
import { workflowRunStore } from "../runtime/workflowRunStore.js";
import { salesSourceLabel } from "./dataImportService.js";
import { createDemoReport } from "./demoReports.js";
import { liveOrDemo } from "./liveOrDemo.js";

function asRiskLevel(value: string): "low" | "medium" | "high" {
  return value === "high" || value === "medium" ? value : "low";
}

function countBy<T>(items: T[], predicate: (item: T) => boolean): number {
  return items.filter(predicate).length;
}

export function createReportView(
  products: ProcessedProduct[],
  content: ContentPlan[],
  promotions: PromotionPlan[],
  salesOrders: SalesOrder[] = [],
  generatedAt = new Date().toISOString()
): ReportView {
  const sales = createSalesAnalytics(salesOrders, { sourceLabel: salesSourceLabel() });
  const readyProducts = countBy(products, (item) => item.status === "product_ready");
  const productBlocked = countBy(products, (item) => item.risk_level === "high" || item.status.includes("rewrite"));
  const readyContent = countBy(content, (item) => item.status === "ready_to_post");
  const contentWaiting = countBy(content, (item) => ["ready_to_write", "content_ready_for_qa", "owner_review_required"].includes(item.status));
  const contentBlocked = countBy(content, (item) => item.status === "needs_rewrite" || item.final_risk_level === "high");
  const promoWaiting = countBy(promotions, (item) => item.status === "suggested");
  const promoBlocked = countBy(promotions, (item) => item.status === "hold" || item.status === "rejected");
  const approvedPromotions = countBy(promotions, (item) => item.status === "approved");
  const failedRuns = workflowRunStore.list().filter((run) => run.status === "failed").length;
  const riskCount = productBlocked + contentBlocked + promoBlocked + failedRuns;
  const healthScore = Math.max(35, Math.min(100, 100 - riskCount * 8 - contentWaiting * 2 - promoWaiting * 2));

  const metrics: ReportMetric[] = [
    { id: "ready-products", label: "สินค้าพร้อมขาย", value: readyProducts, unit: "รายการ", note: `จากทั้งหมด ${products.length} รายการ`, tone: "blue" },
    { id: "content-pipeline", label: "คอนเทนต์ในระบบ", value: content.length, unit: "โพสต์", note: `พร้อมโพสต์ ${readyContent} โพสต์`, tone: "green" },
    { id: "owner-queue", label: "รอเจ้าของร้าน", value: countBy(content, (item) => item.status === "owner_review_required") + promoWaiting, unit: "รายการ", note: "ต้องอนุมัติก่อนใช้งานจริง", tone: "purple" },
    { id: "promo-active", label: "โปรโมชันอนุมัติ", value: approvedPromotions, unit: "แคมเปญ", note: `รออนุมัติ ${promoWaiting} รายการ`, tone: "yellow" },
    { id: "risk-items", label: "ประเด็นเสี่ยง", value: riskCount, unit: "จุด", note: failedRuns ? "มี workflow ล้มเหลว" : "ไม่มี workflow ล้มเหลว", tone: "pink" }
  ];

  const workflow: ReportWorkflowItem[] = [
    { id: "product", label: "Product", completed: readyProducts, waiting: products.length - readyProducts - productBlocked, blocked: productBlocked },
    { id: "content", label: "Content", completed: readyContent, waiting: contentWaiting, blocked: contentBlocked },
    { id: "image", label: "Image", completed: countBy(content, (item) => item.image_status === "image_brief_ready"), waiting: countBy(content, (item) => item.status === "content_passed" && item.image_status !== "image_brief_ready"), blocked: 0 },
    { id: "promotion", label: "Promotion", completed: approvedPromotions, waiting: promoWaiting, blocked: promoBlocked }
  ];

  const productRisks: ReportRiskItem[] = products
    .filter((item) => item.risk_level !== "low" || item.status.includes("rewrite") || item.status === "needs_product_check")
    .map((item) => ({
      id: `product-${item.product_id}`,
      source: "product",
      title: item.title_th || item.sku,
      status: item.status,
      riskLevel: asRiskLevel(item.risk_level),
      note: item.risk_note || "ข้อมูลสินค้ายังต้องตรวจ"
    }));
  const contentRisks: ReportRiskItem[] = content
    .filter((item) => item.final_risk_level !== "low" || ["needs_rewrite", "owner_review_required"].includes(item.status))
    .map((item) => ({
      id: `content-${item.content_id}`,
      source: "content",
      title: item.theme || item.idea,
      status: item.status,
      riskLevel: item.final_risk_level,
      note: item.rewrite_instruction || item.risk_note || item.qa_note || "ต้องตรวจเนื้อหาก่อนเผยแพร่"
    }));
  const promotionRisks: ReportRiskItem[] = promotions
    .filter((item) => item.status === "hold" || item.status === "rejected" || item.risk_note)
    .map((item) => ({
      id: `promotion-${item.promo_id}`,
      source: "promotion",
      title: item.related_product_sku || item.promo_type,
      status: item.status,
      riskLevel: item.status === "rejected" ? "high" : "medium",
      note: item.risk_note || item.manager_note || "ต้องตรวจโปรโมชั่นก่อนอนุมัติ"
    }));
  const risks = [...productRisks, ...contentRisks, ...promotionRisks]
    .sort((a, b) => (b.riskLevel === "high" ? 2 : b.riskLevel === "medium" ? 1 : 0) - (a.riskLevel === "high" ? 2 : a.riskLevel === "medium" ? 1 : 0))
    .slice(0, 8);
  const topSalesProduct = sales.topProducts[0];
  const salesDrivenRecommendations: ReportRecommendation[] = products
    .map((product) => {
      const salesSummary = sales.bySku.get(product.sku);
      const signals = deriveProductSalesSignals({
        stock: product.stock,
        isNewArrival: product.is_new_arrival
      }, salesSummary);

      if (signals.status === "restock_risk") {
        return {
          id: `rec-restock-${product.product_id}`,
          priority: "high" as const,
          title: `เช็ก stock สินค้าขายดี ${product.sku}`,
          detail: signals.summary,
          owner: "Manager"
        };
      }

      if (signals.status === "slow_mover") {
        return {
          id: `rec-slow-${product.product_id}`,
          priority: "medium" as const,
          title: `เร่งรอบขายสำหรับ ${product.sku}`,
          detail: signals.recommendedAction,
          owner: "Marketing"
        };
      }

      return null;
    })
    .filter(Boolean)
    .slice(0, 3) as ReportRecommendation[];

  const recommendations: ReportRecommendation[] = [
    contentBlocked > 0 && {
      id: "rec-content-rewrite",
      priority: "high",
      title: "แก้คอนเทนต์ที่ QA ไม่ผ่านก่อน",
      detail: `มี ${contentBlocked} โพสต์ที่ต้องแก้หรือมีความเสี่ยงสูง`,
      owner: "Content QA"
    },
    productBlocked > 0 && {
      id: "rec-product-risk",
      priority: "high",
      title: "ตรวจสินค้าที่ข้อมูลยังเสี่ยง",
      detail: `มี ${productBlocked} รายการที่ต้องตรวจข้อความ สถานะ หรือข้อมูลต้นทุน`,
      owner: "Product Specialist"
    },
    promoWaiting > 0 && {
      id: "rec-promo-approval",
      priority: "medium",
      title: "เคลียร์โปรโมชั่นรออนุมัติ",
      detail: `มี ${promoWaiting} ข้อเสนอที่รอเจ้าของร้านตัดสินใจ`,
      owner: "เจ้าของร้าน"
    },
    topSalesProduct && (products.find((item) => item.sku === topSalesProduct.sku)?.stock ?? 0) <= 5 && {
      id: "rec-restock-top-seller",
      priority: "medium",
      title: "เช็ก stock ของสินค้าขายดี",
      detail: `${topSalesProduct.productName} ขาย ${topSalesProduct.units30d} ชิ้นใน 30 วัน แต่ stock ค่อนข้างต่ำ`,
      owner: "Manager"
    },
    readyContent > 0 && {
      id: "rec-ready-post",
      priority: "low",
      title: "จัดคิวโพสต์ที่พร้อมแล้ว",
      detail: `มี ${readyContent} โพสต์ที่ผ่าน QA และพร้อมใช้งาน`,
      owner: "Manager"
    },
    ...salesDrivenRecommendations
  ].filter(Boolean) as ReportRecommendation[];

  return {
    mode: config.hasGoogleCredentials ? "live" : "demo",
    generatedAt,
    summaryText: createDailyReport(products, content, promotions),
    healthScore,
    sales: {
      sourceLabel: sales.sourceLabel,
      totalOrders30d: sales.totalOrders30d,
      totalUnits30d: sales.totalUnits30d,
      totalRevenue30d: sales.totalRevenue30d,
      topProduct: sales.topProducts[0]?.productName ?? "ยังไม่มีข้อมูล"
    },
    metrics,
    workflow,
    risks,
    recommendations
  };
}

export async function getReportView(): Promise<ReportView> {
  return liveOrDemo(loadLiveReport, createDemoReport, "report");
}

async function loadLiveReport(): Promise<ReportView> {
  const repos = createRepos();
  const [products, content, promotions, salesOrders] = await Promise.all([
    repos.processedProducts.all(),
    repos.contentPlans.all(),
    repos.promotionPlans.all(),
    repos.salesOrders.all()
  ]);
  return createReportView(products, content, promotions, salesOrders);
}
