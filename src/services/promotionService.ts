import { canApprovePromotion } from "../business/promotionRules.js";
import {
  derivePromotionIntelligence,
  PromotionCampaignSignals
} from "../business/promotionStrategyRules.js";
import { createSalesAnalytics, salesSummaryForSku } from "../business/salesAnalytics.js";
import { config } from "../config.js";
import { strategyActionStore } from "../runtime/strategyActionStore.js";
import { workflowRunStore } from "../runtime/workflowRunStore.js";
import { createRepos } from "../sheets/repos.js";
import { ApprovalViewItem, PromotionResponse, PromotionViewItem } from "../types/promotionView.js";
import { CeoStrategy } from "../types/agent.js";
import { PromotionPlan } from "../types/promotion.js";
import { ProcessedProduct } from "../types/product.js";
import { salesSourceLabel } from "./dataImportService.js";
import { getDemoPromotions } from "./demoPromotions.js";
import { liveOrDemo } from "./liveOrDemo.js";
import {
  createActionPromotionView,
  visibleActionArtifacts
} from "./strategyArtifacts.js";
import { latestCeoStrategy } from "./strategyInsights.js";

type CampaignResult = {
  campaign_name?: string;
  product_focus?: string[];
  warning_rules?: string[];
  warnings?: string[];
};

function latestCampaignSignals(): PromotionCampaignSignals | null {
  const run = workflowRunStore.list().find(
    (item) => item.workflowName === "marketing:campaign" && item.status === "completed"
  );
  if (!run || !run.result || typeof run.result !== "object") return null;
  const result = run.result as CampaignResult;
  return {
    name: result.campaign_name ?? "Marketing Campaign",
    productFocus: result.product_focus ?? [],
    warnings: result.warning_rules ?? result.warnings ?? []
  };
}

export function createPromotionView(
  promotion: PromotionPlan,
  product?: ProcessedProduct,
  context?: {
    strategy?: CeoStrategy | null;
    campaign?: PromotionCampaignSignals | null;
    salesSummary?: ReturnType<typeof salesSummaryForSku>;
  }
): PromotionViewItem {
  const decision = canApprovePromotion(promotion, product);
  const intelligence = derivePromotionIntelligence(promotion, product, {
    strategy: context?.strategy ?? null,
    campaign: context?.campaign ?? null,
    sales: context?.salesSummary ?? null,
    approvalAllowed: decision.allowed,
    approvalReason: promotion.status === "suggested" && !decision.allowed ? decision.reason : ""
  });
  return {
    id: promotion.promo_id,
    type: promotion.promo_type,
    productSku: promotion.related_product_sku,
    productName: product?.title_th || promotion.related_product_sku,
    bundleSku: promotion.bundle_sku,
    discountType: promotion.discount_type,
    discountValue: promotion.discount_value,
    startDate: promotion.start_date,
    endDate: promotion.end_date,
    reason: promotion.reason,
    expectedGoal: promotion.expected_goal,
    riskNote: promotion.risk_note,
    managerNote: promotion.manager_note,
    status: promotion.status,
    createdBy: promotion.created_by,
    createdAt: promotion.created_at,
    approvedAt: promotion.approved_at,
    hasMarginData: Boolean(product && product.cost_price !== null && product.margin_percent !== null),
    stock: intelligence.stockUnits,
    stockLabel: intelligence.stockLabel,
    marginPercent: intelligence.marginPercent,
    riskLevel: intelligence.riskLevel,
    routeLabel: intelligence.routeLabel,
    approvalReadiness: intelligence.approvalReadiness,
    strategyLabels: intelligence.strategyLabels,
    decisionSummary: intelligence.decisionSummary,
    watchouts: intelligence.watchouts,
    approvalBlockedReason: promotion.status === "suggested" && !decision.allowed ? decision.reason : ""
  };
}

export async function getPromotions(): Promise<PromotionResponse> {
  return liveOrDemo(loadLivePromotions, getDemoPromotions, "promotions");
}

async function loadLivePromotions(): Promise<PromotionResponse> {
  const repos = createRepos();
  const [promotions, products, content, salesOrders] = await Promise.all([
    repos.promotionPlans.all(),
    repos.processedProducts.all(),
    repos.contentPlans.all(),
    repos.salesOrders.all()
  ]);
  const bySku = new Map(products.map((product) => [product.sku, product]));
  const runs = workflowRunStore.list();
  const strategy = latestCeoStrategy(runs);
  const campaign = latestCampaignSignals();
  const sales = createSalesAnalytics(salesOrders, { sourceLabel: salesSourceLabel() });
  const items = promotions
    .map((promotion) => createPromotionView(
      promotion,
      bySku.get(promotion.related_product_sku),
      {
        strategy,
        campaign,
        salesSummary: salesSummaryForSku(sales, promotion.related_product_sku)
      }
    ))
    .concat(
      visibleActionArtifacts(strategyActionStore.snapshot().recentArtifacts)
        .filter((artifact) => artifact.kind === "promotion_plan")
        .map((artifact) =>
          createActionPromotionView(
            artifact,
            bySku.get(artifact.sku || "")
          )
        )
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const approvals: ApprovalViewItem[] = [
    ...content
      .filter((item) => item.status === "owner_review_required")
      .map((item) => ({
        id: item.content_id,
        kind: "content" as const,
        title: item.theme,
        subtitle: `${item.content_type} · ${item.related_product_sku || "general"}`,
        status: item.status,
        riskLevel: item.final_risk_level,
        score: item.qa_score,
        reason: item.risk_note || item.qa_note || "Owner review required",
        createdAt: item.updated_at || item.created_at
      })),
    ...items
      .filter((item) => item.status === "suggested")
      .map((item) => ({
        id: item.id,
        kind: "promotion" as const,
        title: `${item.type}: ${item.productName}`,
        subtitle: item.bundleSku ? `${item.productSku} + ${item.bundleSku}` : item.productSku,
        status: item.status,
        riskLevel: item.riskLevel,
        score: null,
        reason: item.approvalBlockedReason || item.watchouts[0] || item.decisionSummary,
        createdAt: item.createdAt
      }))
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    mode: "live",
    summary: {
      total: items.length,
      suggested: items.filter((item) => item.status === "suggested").length,
      approved: items.filter((item) => item.status === "approved").length,
      rejected: items.filter((item) => item.status === "rejected").length,
      hold: items.filter((item) => item.status === "hold").length
    },
    promotions: items,
    approvals
  };
}
