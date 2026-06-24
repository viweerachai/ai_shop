import { config } from "../config.js";
import { createSalesAnalytics } from "../business/salesAnalytics.js";
import { strategyActionStore } from "../runtime/strategyActionStore.js";
import { workflowRunStore } from "../runtime/workflowRunStore.js";
import { createRepos } from "../sheets/repos.js";
import { MarketingView } from "../types/marketingView.js";
import { salesSourceLabel } from "./dataImportService.js";
import { getDemoMarketing } from "./demoMarketing.js";
import { liveOrDemo } from "./liveOrDemo.js";
import { visibleActionArtifacts } from "./strategyArtifacts.js";
import { buildStrategyBrief, latestCeoStrategy } from "./strategyInsights.js";

type CampaignResult = {
  campaign_name?: string;
  target_customer?: string;
  key_message?: string;
  content_mix?: string[];
  product_focus?: string[];
  recommended_content_ideas?: string[];
  promotion_ideas?: string[];
  warning_rules?: string[];
  warnings?: string[];
};

function latestCampaignResult(): { result: CampaignResult; generatedAt: string } | undefined {
  const run = workflowRunStore.list().find(
    (item) => item.workflowName === "marketing:campaign" && item.status === "completed"
  );
  if (!run || !run.result || typeof run.result !== "object") return undefined;
  return { result: run.result as CampaignResult, generatedAt: run.finishedAt || run.startedAt };
}

export async function getMarketingView(): Promise<MarketingView> {
  return liveOrDemo(loadLiveMarketing, getDemoMarketing, "marketing");
}

async function loadLiveMarketing(): Promise<MarketingView> {
  const repos = createRepos();
  const [products, content, promotions, salesOrders, trendSignals] = await Promise.all([
    repos.processedProducts.all(),
    repos.contentPlans.all(),
    repos.promotionPlans.all(),
    repos.salesOrders.all(),
    repos.trendSignals.active()
  ]);
  const latest = latestCampaignResult();
  const newArrivals = products.filter((product) => product.is_new_arrival);
  const eligible = products.filter(
    (product) => product.status === "product_ready" && product.risk_level !== "high"
  );
  const strategy = latestCeoStrategy(workflowRunStore.list());
  const sales = createSalesAnalytics(salesOrders, { sourceLabel: salesSourceLabel() });
  const strategyBrief = buildStrategyBrief(products, content, promotions, strategy, sales, trendSignals);
  const actionSnapshot = strategyActionStore.snapshot();
  const customActions = strategyActionStore.customActions();
  const visibleArtifacts = visibleActionArtifacts(actionSnapshot.recentArtifacts);
  const result = latest?.result;
  return {
    mode: "live",
    campaign: {
      name: result?.campaign_name ?? "ยังไม่มี Marketing Campaign",
      targetCustomer: result?.target_customer ?? "รอ AI Marketing วิเคราะห์กลุ่มลูกค้า",
      keyMessage: result?.key_message ?? "รัน Marketing Campaign เพื่อสร้างทิศทางล่าสุด",
      contentMix: result?.content_mix ?? [],
      productFocus: strategyBrief.priorityProducts.map((item) => ({
        sku: item.sku,
        name: item.name,
        reason: item.reason,
        stock: item.stock,
        riskLevel: item.riskLevel,
        score: item.score,
        salesLast7d: item.salesLast7d,
        salesLast30d: item.salesLast30d,
        revenueLast30d: item.revenueLast30d
      })),
      ideas: result?.recommended_content_ideas ?? [],
      promotionIdeas: result?.promotion_ideas ?? [],
      warnings: result?.warning_rules ?? result?.warnings ?? [
        "ห้ามใช้ asset ที่สินค้าไม่มี",
        "Promotion ต้องรอเจ้าของร้านอนุมัติ"
      ],
      generatedAt: latest?.generatedAt ?? ""
    },
    strategy: {
      shopPriority: strategyBrief.shopPriority,
      weeklyDirection: strategyBrief.weeklyDirection,
      marketingInstruction: strategyBrief.marketingInstruction,
      managerInstruction: strategyBrief.managerInstruction,
      salesSource: sales.sourceLabel,
      drivers: strategyBrief.drivers,
      watchouts: strategyBrief.watchouts,
      nextMoves: strategyBrief.nextMoves,
      actions: strategyActionStore.apply([...customActions, ...strategyBrief.actions]),
      activeTasks: actionSnapshot.activeTasks,
      recentHistory: actionSnapshot.recentHistory,
      recentArtifacts: visibleArtifacts
    },
    summary: {
      eligibleProducts: eligible.length,
      newArrivals: newArrivals.length,
      promotionCandidates: promotions.filter((promotion) => promotion.status === "suggested").length,
      contentPlanned: content.length,
      salesOrders30d: sales.totalOrders30d,
      revenue30d: sales.totalRevenue30d
    }
  };
}
