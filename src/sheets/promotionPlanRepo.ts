import { promotionPlanSchema, PromotionPlan } from "../types/promotion.js";
import { BaseSheetRepo } from "./baseRepo.js";
import { GoogleSheetsClient } from "./googleSheetsClient.js";

export class PromotionPlanRepo extends BaseSheetRepo<PromotionPlan> {
  constructor(client: GoogleSheetsClient) {
    super(client, "promotion_plan", "promo_id", promotionPlanSchema);
  }
}
