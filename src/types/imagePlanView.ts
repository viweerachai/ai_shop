export interface ImagePlanViewItem {
  id: string;
  theme: string;
  contentType: string;
  productSku: string;
  productName: string;
  platform: string;
  imageType: "template" | "product_photo" | "ai_image" | "";
  imageConcept: string;
  imageText: string;
  imagePrompt: string;
  imageNote: string;
  imageStatus: string;
  generatedImageUrl: string;
  generatedImageFile: string;
  generatedImageProvider: string;
  generatedImageModel: string;
  generatedImagePrompt: string;
  generatedImageAt: string;
  imageApprovalStatus: string;
  availableAssets: string[];
  assetNote: string;
  assetSource?: "sheet" | "drive" | "fallback" | "demo";
  driveFolderId?: string;
  driveFolderUrl?: string;
  driveAssetCount?: number;
  driveFiles?: Array<{
    id: string;
    name: string;
    mimeType: string;
    webViewLink: string;
    webContentLink: string;
    thumbnailLink: string;
    modifiedTime: string;
  }>;
  brandedProduct: boolean;
  canMakeUnboxing: boolean;
  status: string;
  riskLevel: "low" | "medium" | "high";
  updatedAt: string;
}

export interface ImagePlanResponse {
  mode: "live" | "demo";
  summary: {
    total: number;
    waiting: number;
    ready: number;
    productPhoto: number;
    template: number;
    aiImage: number;
  };
  plans: ImagePlanViewItem[];
}
