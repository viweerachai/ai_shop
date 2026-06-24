import { processedProductSchema, ProcessedProduct } from "../types/product.js";
import { BaseSheetRepo } from "./baseRepo.js";
import { GoogleSheetsClient } from "./googleSheetsClient.js";

export class ProcessedProductRepo extends BaseSheetRepo<ProcessedProduct> {
  constructor(client: GoogleSheetsClient) {
    super(client, "processed_products", "product_id", processedProductSchema);
  }
}
