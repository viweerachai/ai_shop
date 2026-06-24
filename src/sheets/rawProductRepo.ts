import { rawProductSchema, RawProduct } from "../types/product.js";
import { BaseSheetRepo } from "./baseRepo.js";
import { GoogleSheetsClient } from "./googleSheetsClient.js";

export class RawProductRepo extends BaseSheetRepo<RawProduct> {
  constructor(client: GoogleSheetsClient) {
    super(client, "raw_products", "product_id", rawProductSchema);
  }
}
