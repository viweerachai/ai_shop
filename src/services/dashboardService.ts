import { config } from "../config.js";
import { createRepos } from "../sheets/repos.js";
import { DashboardData, DashboardMetric, WorkflowStage } from "../types/dashboard.js";
import { createSalesAnalytics } from "../business/salesAnalytics.js";
import { getSystemSettings } from "../runtime/systemSettings.js";
import { strategyActionStore } from "../runtime/strategyActionStore.js";
import { workflowRunStore } from "../runtime/workflowRunStore.js";
import { createDemoDashboard } from "./demoDashboard.js";
import { liveOrDemo } from "./liveOrDemo.js";
import { salesSourceLabel } from "./dataImportService.js";
import { visibleActionArtifacts } from "./strategyArtifacts.js";
import { buildStrategyBrief, latestCeoStrategy } from "./strategyInsights.js";
import { WorkflowName } from "../runtime/workflowRunner.js";
import { WorkflowRun } from "../runtime/workflowRunStore.js";

function sameLocalDay(value: string, reference: Date): boolean {
  if (!value) return false;
  const date = new Date(value);
  return date.toLocaleDateString("en-CA", { timeZone: config.timezone }) ===
    reference.toLocaleDateString("en-CA", { timeZone: config.timezone });
}

function nextScheduledRun(): string {
  const [hour, minute] = config.dailyAutoRunTime.split(":").map(Number);
  const next = new Date();
  next.setHours(hour ?? 9, minute ?? 0, 0, 0);
  if (next <= new Date()) next.setDate(next.getDate() + 1);
  return next.toISOString();
}

function stageStatus(
  runs: WorkflowRun[],
  names: WorkflowName[],
  pendingCount: number,
  reference: Date
): WorkflowStage["status"] {
  const related = runs.filter((run) => names.includes(run.workflowName as WorkflowName));
  if (related.some((run) => run.status === "running")) return "running";
  const today = related.filter((run) => sameLocalDay(run.startedAt, reference));
  if (today.some((run) => run.status === "failed")) return "failed";
  if (today.some((run) => run.status === "completed")) return "completed";
  if (pendingCount > 0) return "attention";
  return "waiting";
}

export async function getDashboardData(): Promise<DashboardData> {
  return liveOrDemo(loadLiveDashboard, createDemoDashboard, "dashboard");
}

async function loadLiveDashboard(): Promise<DashboardData> {
  const repos = createRepos();
  const [raw, products, content, promotions, salesOrders, trendSignals] = await Promise.all([
    repos.rawProducts.all(),
    repos.processedProducts.all(),
    repos.contentPlans.all(),
    repos.promotionPlans.all(),
    repos.salesOrders.all(),
    repos.trendSignals.active()
  ]);
  const now = new Date();
  const settings = getSystemSettings();
  const runs = workflowRunStore.list();
  const latest = runs[0];
  const failedRuns = runs.filter((run) => run.status === "failed");
  const missingProducts = products.filter((product) => product.status === "needs_product_check");
  const qaFailed = content.filter((item) => item.status === "needs_rewrite");
  const ownerQueue = content.filter((item) => item.status === "owner_review_required");
  const ready = content.filter((item) => item.status === "ready_to_post");
  const todayContent = content.filter((item) => sameLocalDay(item.created_at, now));
  const newArrivals = products.filter((product) => product.is_new_arrival);
  const promotionQueue = promotions.filter((promotion) => promotion.status === "suggested");
  const ceoStrategy = latestCeoStrategy(runs);
  const sales = createSalesAnalytics(salesOrders, { sourceLabel: salesSourceLabel() });
  const strategyBrief = buildStrategyBrief(products, content, promotions, ceoStrategy, sales, trendSignals);
  const actionSnapshot = strategyActionStore.snapshot();
  const customActions = strategyActionStore.customActions();
  const visibleArtifacts = visibleActionArtifacts(actionSnapshot.recentArtifacts);
  const processedProductIds = new Set(products.map((product) => product.product_id));
  const pendingProductIntake = raw.filter((item) =>
    !processedProductIds.has(item.product_id) || !item.status || item.status === "new"
  ).length;

  const metrics: DashboardMetric[] = [
    { id: "products", label: "สินค้าทั้งหมด", value: products.length, unit: "รายการ", note: `ขาย ${sales.totalUnits30d} ชิ้นใน 30 วัน`, tone: "blue" },
    { id: "content", label: "คอนเทนต์วันนี้", value: todayContent.length, unit: "โพสต์", note: `รอ QA ${content.filter((item) => item.status === "content_ready_for_qa").length}`, tone: "green" },
    { id: "owner", label: "รออนุมัติ", value: ownerQueue.length, unit: "โพสต์", note: "เจ้าของร้านต้องตรวจ", tone: "purple" },
    { id: "ready", label: "พร้อมโพสต์", value: ready.length, unit: "โพสต์", note: settings.autoPublish ? "พร้อมส่งต่อระบบโพสต์" : "AUTO_PUBLISH ปิดอยู่", tone: "yellow" },
    { id: "errors", label: "ข้อผิดพลาด", value: qaFailed.length + failedRuns.length, unit: "รายการ", note: failedRuns.length ? "มี workflow ล้มเหลว" : "ระบบปกติ", tone: "pink" }
  ];

  const stage = (
    id: string,
    label: string,
    description: string,
    count: number,
    names: WorkflowName[]
  ): WorkflowStage => ({
    id,
    label,
    description,
    count,
    status: stageStatus(runs, names, count, now)
  });

  return {
    mode: "live",
    generatedAt: now.toISOString(),
    systemHealth: failedRuns.length ? "warning" : "healthy",
    autoMode: settings.autoMode,
    autoPublish: settings.autoPublish,
    lastRun: latest?.startedAt ?? "",
    nextRun: nextScheduledRun(),
    metrics,
    workflow: [
      stage("product", "สินค้า", "ตรวจสินค้าใหม่", pendingProductIntake, ["product:intake", "product:write", "product:qa"]),
      stage("marketing", "การตลาด", "วางแผนแคมเปญ", 0, ["ceo:daily", "marketing:campaign"]),
      stage("content", "คอนเทนต์", "เขียนคอนเทนต์", content.filter((item) => ["ready_to_write", "needs_rewrite"].includes(item.status)).length, ["content:new-arrival", "content:plan", "content:write", "content:qa"]),
      stage("image", "ภาพ", "สร้างแผนภาพ", content.filter((item) => item.status === "content_passed").length, ["image:plan"]),
      stage("promotion", "โปรโมชั่น", "ตรวจโปรโมชั่น", promotionQueue.length, ["promo:suggest", "manager:final-check"]),
      stage("report", "รายงาน", "สรุปรายงาน", 0, ["report:daily"])
    ],
    readyContent: [...ready, ...ownerQueue].slice(0, 8).map((item) => ({
      id: item.content_id,
      title: item.theme || item.idea,
      product: item.related_product_sku || "คอนเทนต์ทั่วไป",
      platform: item.target_platform,
      publishDate: item.publish_date || "ยังไม่กำหนด",
      ownerStatus: item.owner_status || (item.status === "owner_review_required" ? "pending" : "approved"),
      riskLevel: item.final_risk_level,
      contentType: item.content_type
    })),
    alerts: [
      ...missingProducts.slice(0, 3).map((product) => ({ id: `product-${product.product_id}`, type: "warning" as const, message: `สินค้า ${product.sku} ข้อมูลไม่ครบ`, age: "ต้องตรวจสอบ" })),
      ...qaFailed.slice(0, 3).map((item) => ({ id: `qa-${item.content_id}`, type: "error" as const, message: `QA ไม่ผ่าน: ${item.theme}`, age: "รอเขียนใหม่" })),
      ...promotionQueue.slice(0, 2).map((item) => ({ id: `promo-${item.promo_id}`, type: "info" as const, message: `โปรโมชั่น ${item.promo_type} รออนุมัติ`, age: "รอเจ้าของร้าน" })),
      ...visibleArtifacts.slice(0, 2).map((artifact) => ({
        id: `artifact-${artifact.artifactId}`,
        type: "info" as const,
        message: `${artifact.title} ถูกสร้างจาก action queue`,
        age: artifact.status === "done" ? "พร้อมส่งต่อ workflow" : "รอดำเนินการ"
      })),
      ...(failedRuns[0] ? [{ id: failedRuns[0].runId, type: "error" as const, message: failedRuns[0].error ?? "Workflow error", age: failedRuns[0].workflowName }] : [])
    ].slice(0, 8),
    timeline: runs.slice(0, 6).map((run) => ({
      time: new Date(run.startedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: config.timezone }),
      label: run.workflowName,
      status: run.status
    })),
    ceo: {
      status: runs.some((run) => run.workflowName === "ceo:daily" && run.status === "running") ? "กำลังทำงาน" : "พร้อมทำงาน",
      salesSource: sales.sourceLabel,
      salesSummary: {
        orders30d: sales.totalOrders30d,
        units30d: sales.totalUnits30d,
        revenue30d: sales.totalRevenue30d,
        topProduct: sales.topProducts[0]?.productName ?? "ยังไม่มีข้อมูล"
      },
      shopPriority: strategyBrief.shopPriority,
      weeklyDirection: strategyBrief.weeklyDirection,
      recommendation: strategyBrief.recommendation,
      instructions: [
        strategyBrief.marketingInstruction,
        strategyBrief.managerInstruction,
        ...strategyBrief.nextMoves
      ].slice(0, 5),
      drivers: strategyBrief.drivers,
      watchouts: strategyBrief.watchouts,
      actions: strategyActionStore.apply([...customActions, ...strategyBrief.actions]),
      activeTasks: actionSnapshot.activeTasks,
      recentHistory: actionSnapshot.recentHistory,
      recentArtifacts: visibleArtifacts,
      priorityProducts: strategyBrief.priorityProducts.map((item) => ({
        sku: item.sku,
        name: item.name,
        reason: item.reason,
        stock: item.stock,
        riskLevel: item.riskLevel,
        salesLast7d: item.salesLast7d,
        salesLast30d: item.salesLast30d
      }))
    }
  };
}
