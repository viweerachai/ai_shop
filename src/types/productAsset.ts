import { z } from "zod";

export const productAssetSchema = z.object({
  sku: z.string(),
  product_name: z.string().default(""),
  drive_folder_id: z.string().default(""),
  drive_folder_url: z.string().default(""),
  asset_note: z.string().default(""),
  created_at: z.string().default(""),
  updated_at: z.string().default("")
});

export type ProductAsset = z.infer<typeof productAssetSchema>;

export interface DriveAssetFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  webContentLink: string;
  thumbnailLink: string;
  modifiedTime: string;
}

export interface ProductAssetView {
  sku: string;
  productName: string;
  driveFolderId: string;
  driveFolderUrl: string;
  assetNote: string;
  assetCount: number;
  availableAssets: string[];
  files: DriveAssetFile[];
  updatedAt: string;
  source: "sheet" | "drive" | "fallback";
}
