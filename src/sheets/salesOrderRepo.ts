import { BaseSheetRepo } from "./baseRepo.js";
import { GoogleSheetsClient } from "./googleSheetsClient.js";
import { salesOrderSchema, SalesOrder } from "../types/salesOrder.js";

export class SalesOrderRepo extends BaseSheetRepo<SalesOrder> {
  constructor(client: GoogleSheetsClient) {
    super(client, "sales_orders", "order_id", salesOrderSchema);
  }
}
