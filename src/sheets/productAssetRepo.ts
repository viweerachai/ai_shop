import { BaseSheetRepo } from "./baseRepo.js";
import { GoogleSheetsClient } from "./googleSheetsClient.js";
import { productAssetSchema, ProductAsset } from "../types/productAsset.js";

export class ProductAssetRepo extends BaseSheetRepo<ProductAsset> {
  constructor(client: GoogleSheetsClient) {
    super(client, "product_assets", "sku", productAssetSchema);
  }
}
