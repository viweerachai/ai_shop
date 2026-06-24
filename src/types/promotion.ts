import { z } from "zod";

export const promotionPlanSchema = z.object({
  promo_id: z.string(),
  promo_type: z.string(),
  related_product_sku: z.string().default(""),
  bundle_sku: z.string().default(""),
  discount_type: z.string().default(""),
  discount_value: z.string().default(""),
  start_date: z.string().default(""),
  end_date: z.string().default(""),
  reason: z.string().default(""),
  expected_goal: z.string().default(""),
  risk_note: z.string().default(""),
  manager_note: z.string().default(""),
  status: z.enum(["suggested", "approved", "rejected", "hold", "converted_to_content"]),
  created_by: z.string().default("AI Sales Analyst"),
  created_at: z.string().default(""),
  approved_at: z.string().default("")
});

export type PromotionPlan = z.infer<typeof promotionPlanSchema>;
