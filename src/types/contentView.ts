export interface ContentViewItem {
  id: string;
  week: string;
  contentType: string;
  theme: string;
  productSku: string;
  productName: string;
  platform: string;
  status: string;
  idea: string;
  caption: string;
  hashtags: string[];
  writerNote: string;
  strategyLabels: string[];
  riskNote: string;
  riskLevel: "low" | "medium" | "high";
  qaStatus: string;
  qaScore: number;
  qaIssues: string[];
  qaNote: string;
  rewriteInstruction: string;
  imageStatus: string;
  ownerStatus: string;
  publishDate: string;
  updatedAt: string;
}

export interface ContentListResponse {
  mode: "live" | "demo";
  summary: {
    total: number;
    readyToWrite: number;
    waitingQa: number;
    needsRewrite: number;
    ownerReview: number;
    readyToPost: number;
  };
  content: ContentViewItem[];
}
