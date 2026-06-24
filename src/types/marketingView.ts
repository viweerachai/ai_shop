import { StrategyAction } from "./strategyAction.js";

export interface MarketingView {
  mode: "live" | "demo";
  campaign: {
    name: string;
    targetCustomer: string;
    keyMessage: string;
    contentMix: string[];
    productFocus: Array<{
      sku: string;
      name: string;
      reason: string;
      stock: number | null;
      riskLevel: "low" | "medium" | "high";
      score: number;
      salesLast7d: number;
      salesLast30d: number;
      revenueLast30d: number;
    }>;
    ideas: string[];
    promotionIdeas: string[];
    warnings: string[];
    generatedAt: string;
  };
  strategy: {
    shopPriority: string;
    weeklyDirection: string;
    marketingInstruction: string;
    managerInstruction: string;
    salesSource: string;
    drivers: string[];
    watchouts: string[];
    nextMoves: string[];
    actions: StrategyAction[];
    activeTasks: import("./strategyAction.js").StrategyActionTask[];
    recentHistory: import("./strategyAction.js").StrategyActionHistoryEntry[];
    recentArtifacts: import("./strategyAction.js").StrategyActionArtifact[];
  };
  summary: {
    eligibleProducts: number;
    newArrivals: number;
    promotionCandidates: number;
    contentPlanned: number;
    salesOrders30d: number;
    revenue30d: number;
  };
}
