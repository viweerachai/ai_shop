import { contentPlanSchema, ContentPlan } from "../types/content.js";
import { BaseSheetRepo } from "./baseRepo.js";
import { GoogleSheetsClient } from "./googleSheetsClient.js";

export class ContentPlanRepo extends BaseSheetRepo<ContentPlan> {
  constructor(client: GoogleSheetsClient) {
    super(client, "content_plan", "content_id", contentPlanSchema);
  }
}
