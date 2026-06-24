import { z } from "zod";
import { BaseSheetRepo } from "./baseRepo.js";
import { GoogleSheetsClient } from "./googleSheetsClient.js";

export const promptRuleSchema = z.object({
  rule_id: z.string(),
  type: z.string(),
  content: z.string(),
  active: z.coerce.string().transform((value) => !["false", "0", "no", ""].includes(value.toLowerCase())),
  created_at: z.string().default(""),
  updated_at: z.string().default("")
});
export type PromptRule = z.infer<typeof promptRuleSchema>;

export class PromptRuleRepo extends BaseSheetRepo<PromptRule> {
  constructor(client: GoogleSheetsClient) {
    super(client, "ai_prompt_rules", "rule_id", promptRuleSchema);
  }

  async activeFor(types: string[]): Promise<PromptRule[]> {
    return this.where((rule) => rule.active && types.includes(rule.type));
  }
}
