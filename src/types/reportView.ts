export interface ReportMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  note: string;
  tone: "blue" | "green" | "purple" | "yellow" | "pink";
}

export interface ReportRecommendation {
  id: string;
  priority: "high" | "medium" | "low";
  title: string;
  detail: string;
  owner: string;
}

export interface ReportRiskItem {
  id: string;
  source: "product" | "content" | "promotion";
  title: string;
  status: string;
  riskLevel: "low" | "medium" | "high";
  note: string;
}

export interface ReportWorkflowItem {
  id: string;
  label: string;
  completed: number;
  waiting: number;
  blocked: number;
}

export interface ReportView {
  mode: "live" | "demo";
  generatedAt: string;
  summaryText: string;
  healthScore: number;
  sales: {
    sourceLabel: string;
    totalOrders30d: number;
    totalUnits30d: number;
    totalRevenue30d: number;
    topProduct: string;
  };
  metrics: ReportMetric[];
  workflow: ReportWorkflowItem[];
  risks: ReportRiskItem[];
  recommendations: ReportRecommendation[];
}
