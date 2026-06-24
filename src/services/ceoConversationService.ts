import { config } from "../config.js";
import { createSalesAnalytics, salesSummaryForSku } from "../business/salesAnalytics.js";
import { trendInsightForProduct } from "../business/trendSignals.js";
import { createCeoConversationReply, CeoConversationAction } from "../agents/ceoConversationAgent.js";
import { ClaudeClient } from "../ai/claudeClient.js";
import { strategyActionStore } from "../runtime/strategyActionStore.js";
import { workflowRunStore } from "../runtime/workflowRunStore.js";
import { createRepos } from "../sheets/repos.js";
import { PromptRule } from "../sheets/promptRuleRepo.js";
import { StrategyAction } from "../types/strategyAction.js";
import { nowIso } from "../utils/date.js";
import { createId } from "../utils/ids.js";
import { salesSourceLabel } from "./dataImportService.js";
import { buildStrategyBrief, latestCeoStrategy } from "./strategyInsights.js";

export type CeoChatResponse = {
  answer: string;
  confidence: "low" | "medium" | "high";
  dataGaps: string[];
  proposedActions: StrategyAction[];
  ruleSuggestion: string;
  appliedActionIds: string[];
};

function normalizeSku(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function toStrategyAction(action: CeoConversationAction): StrategyAction {
  return {
    id: createId("ceo-chat"),
    title: action.title.trim(),
    owner: action.owner,
    priority: action.priority,
    status: action.status === "in_progress" || action.status === "completed" ? "ready" : action.status,
    reason: action.reason.trim(),
    source: action.source,
    sku: normalizeSku(action.sku)
  };
}

export async function askCeo(
  message: string,
  options: { addToQueue?: boolean } = {}
): Promise<CeoChatResponse> {
  if (!config.hasAnthropicCredentials) {
    throw new Error("ANTHROPIC_API_KEY is required for AI CEO Conversation.");
  }

  const repos = createRepos();
  const [products, content, promotions, salesOrders, promptRules, trendSignals] = await Promise.all([
    repos.processedProducts.all(),
    repos.contentPlans.all(),
    repos.promotionPlans.all(),
    repos.salesOrders.all(),
    repos.promptRules.activeFor(["ceo_rule", "marketing_rule", "promotion_rule"]),
    repos.trendSignals.active()
  ]);
  const sales = createSalesAnalytics(salesOrders, { sourceLabel: salesSourceLabel() });
  const strategy = latestCeoStrategy(workflowRunStore.list());
  const brief = buildStrategyBrief(products, content, promotions, strategy, sales, trendSignals);

  const productContext = products
    .map((product) => {
      const productSales = salesSummaryForSku(sales, product.sku);
      const trend = trendInsightForProduct(product, trendSignals);
      const isPriority = brief.priorityProducts.some((item) => item.sku === product.sku);
      return {
        sku: product.sku,
        name: product.title_th || product.sku,
        category: product.category,
        stock: product.stock,
        cost_price: product.cost_price,
        selling_price: product.selling_price,
        margin_percent: product.margin_percent,
        risk_level: product.risk_level,
        risk_note: product.risk_note,
        status: product.status,
        is_new_arrival: product.is_new_arrival,
        content_used_count: product.content_used_count,
        sales_7d: productSales?.units7d ?? 0,
        sales_30d: productSales?.units30d ?? 0,
        revenue_30d: productSales?.revenue30d ?? 0,
        trend_level: trend.level,
        trend_labels: trend.labels,
        trend_score: trend.score,
        is_current_priority: isPriority
      };
    })
    .sort((a, b) => Number(b.is_current_priority) - Number(a.is_current_priority) || b.sales_30d - a.sales_30d)
    .slice(0, 60);

  const result = await createCeoConversationReply(repos, new ClaudeClient(), {
    owner_message: message,
    current_ceo_strategy: strategy,
    current_strategy_brief: {
      shopPriority: brief.shopPriority,
      weeklyDirection: brief.weeklyDirection,
      marketingInstruction: brief.marketingInstruction,
      managerInstruction: brief.managerInstruction,
      priorityProducts: brief.priorityProducts,
      watchouts: brief.watchouts,
      nextMoves: brief.nextMoves
    },
    salesSummary: {
      source: sales.sourceLabel,
      orders7d: sales.totalOrders7d,
      orders30d: sales.totalOrders30d,
      units7d: sales.totalUnits7d,
      units30d: sales.totalUnits30d,
      revenue7d: sales.totalRevenue7d,
      revenue30d: sales.totalRevenue30d,
      topProducts: sales.topProducts.slice(0, 8)
    },
    trendSignals,
    queueSummary: {
      contentWaitingWrite: content.filter((item) => ["ready_to_write", "needs_rewrite"].includes(item.status)).length,
      contentOwnerReview: content.filter((item) => item.status === "owner_review_required").length,
      readyToPost: content.filter((item) => item.status === "ready_to_post").length,
      promotionSuggested: promotions.filter((item) => item.status === "suggested").length
    },
    activeRules: promptRules.map((rule) => rule.content),
    products: productContext,
    existingActions: strategyActionStore.customActions().slice(0, 12)
  });

  const proposedActions = result.proposed_actions
    .filter((action) => action.title.trim() && action.reason.trim())
    .slice(0, 5)
    .map(toStrategyAction);
  const appliedActionIds = options.addToQueue
    ? proposedActions.map((action) => strategyActionStore.addCustomAction(action).id)
    : [];

  return {
    answer: result.answer,
    confidence: result.confidence,
    dataGaps: result.data_gaps,
    proposedActions,
    ruleSuggestion: result.rule_suggestion.trim(),
    appliedActionIds
  };
}

export async function addCeoChatAction(action: Omit<StrategyAction, "id"> & { id?: string }): Promise<StrategyAction> {
  return strategyActionStore.addCustomAction({
    ...action,
    id: action.id?.startsWith("ceo-chat-") ? action.id : createId("ceo-chat"),
    status: action.status === "completed" || action.status === "in_progress" ? "ready" : action.status
  });
}

export async function saveCeoRule(content: string): Promise<PromptRule> {
  if (!config.hasGoogleCredentials) {
    throw new Error("Google Sheets credentials are required to save CEO rules.");
  }
  const now = nowIso();
  const rule: PromptRule = {
    rule_id: createId("ceo_rule"),
    type: "ceo_rule",
    content: content.trim(),
    active: true,
    created_at: now,
    updated_at: now
  };
  await createRepos().promptRules.append([rule]);
  return rule;
}
