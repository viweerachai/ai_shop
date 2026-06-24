import { StrategyAction } from "./strategyAction.js";

export interface DashboardMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  note: string;
  tone: "blue" | "green" | "purple" | "yellow" | "pink";
}

export interface WorkflowStage {
  id: string;
  label: string;
  description: string;
  status: "completed" | "running" | "waiting" | "attention" | "failed";
  count: number;
}

export interface ReadyContentItem {
  id: string;
  title: string;
  product: string;
  platform: string;
  publishDate: string;
  ownerStatus: string;
  riskLevel: "low" | "medium" | "high";
  contentType: string;
}

export interface DashboardAlert {
  id: string;
  type: "warning" | "info" | "success" | "error";
  message: string;
  age: string;
}

export interface TimelineItem {
  time: string;
  label: string;
  status: "completed" | "running" | "waiting" | "failed";
}

export interface DashboardData {
  mode: "live" | "demo";
  generatedAt: string;
  systemHealth: "healthy" | "warning" | "error";
  autoMode: string;
  autoPublish: boolean;
  lastRun: string;
  nextRun: string;
  metrics: DashboardMetric[];
  workflow: WorkflowStage[];
  readyContent: ReadyContentItem[];
  alerts: DashboardAlert[];
  timeline: TimelineItem[];
  ceo: {
    status: string;
    salesSource: string;
    salesSummary: {
      orders30d: number;
      units30d: number;
      revenue30d: number;
      topProduct: string;
    };
    shopPriority: string;
    weeklyDirection: string;
    recommendation: string;
    instructions: string[];
    drivers: string[];
    watchouts: string[];
    actions: StrategyAction[];
    activeTasks: import("./strategyAction.js").StrategyActionTask[];
    recentHistory: import("./strategyAction.js").StrategyActionHistoryEntry[];
    recentArtifacts: import("./strategyAction.js").StrategyActionArtifact[];
    priorityProducts: Array<{
      sku: string;
      name: string;
      reason: string;
      stock: number | null;
      riskLevel: "low" | "medium" | "high";
      salesLast7d: number;
      salesLast30d: number;
    }>;
  };
}
