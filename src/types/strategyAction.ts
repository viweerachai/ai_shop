export interface StrategyAction {
  id: string;
  title: string;
  owner: "CEO" | "Marketing" | "Manager" | "Owner";
  priority: "high" | "medium" | "low";
  status: "ready" | "in_progress" | "completed" | "watch" | "blocked";
  reason: string;
  source: "sales" | "content" | "promotion" | "operations";
  sku?: string;
}

export interface StrategyActionTask {
  taskId: string;
  actionId: string;
  title: string;
  owner: StrategyAction["owner"];
  status: "open" | "done" | "canceled";
  source: StrategyAction["source"];
  detail: string;
  sku?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StrategyActionHistoryEntry {
  historyId: string;
  actionId: string;
  title: string;
  transition: "started" | "completed" | "reset" | "status_changed";
  fromStatus: StrategyAction["status"] | "none";
  toStatus: StrategyAction["status"] | "none";
  createdAt: string;
  note: string;
}

export interface StrategyActionArtifact {
  artifactId: string;
  actionId: string;
  kind: "content_plan" | "promotion_plan" | "stock_followup";
  status: "draft" | "open" | "done" | "canceled";
  title: string;
  summary: string;
  owner: StrategyAction["owner"];
  sku?: string;
  platform?: string;
  contentType?: string;
  promotionType?: string;
  createdAt: string;
  updatedAt: string;
}
