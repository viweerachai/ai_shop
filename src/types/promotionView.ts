export interface PromotionViewItem {
  id: string;
  type: string;
  productSku: string;
  productName: string;
  bundleSku: string;
  discountType: string;
  discountValue: string;
  startDate: string;
  endDate: string;
  reason: string;
  expectedGoal: string;
  riskNote: string;
  managerNote: string;
  status: "suggested" | "approved" | "rejected" | "hold" | "converted_to_content";
  createdBy: string;
  createdAt: string;
  approvedAt: string;
  hasMarginData: boolean;
  stock: number | null;
  stockLabel: string;
  marginPercent: number | null;
  riskLevel: "low" | "medium" | "high";
  routeLabel: string;
  approvalReadiness: "ready" | "needs_review" | "blocked";
  strategyLabels: string[];
  decisionSummary: string;
  watchouts: string[];
  approvalBlockedReason: string;
}

export interface ApprovalViewItem {
  id: string;
  kind: "content" | "promotion";
  title: string;
  subtitle: string;
  status: string;
  riskLevel: "low" | "medium" | "high";
  score: number | null;
  reason: string;
  createdAt: string;
}

export interface PromotionResponse {
  mode: "live" | "demo";
  summary: {
    total: number;
    suggested: number;
    approved: number;
    rejected: number;
    hold: number;
  };
  promotions: PromotionViewItem[];
  approvals: ApprovalViewItem[];
}
