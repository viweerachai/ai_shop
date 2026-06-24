import { z } from "zod";
import { BaseSheetRepo } from "./baseRepo.js";
import { GoogleSheetsClient } from "./googleSheetsClient.js";

export const errorMemorySchema = z.object({
  error_id: z.string(),
  source: z.string(),
  error_type: z.string(),
  description: z.string(),
  correction_rule: z.string(),
  example_bad: z.string().default(""),
  example_good: z.string().default(""),
  active: z.coerce.string().transform((value) => !["false", "0", "no", ""].includes(value.toLowerCase())),
  created_at: z.string()
});
export type ErrorMemory = z.infer<typeof errorMemorySchema>;

export class ErrorMemoryRepo extends BaseSheetRepo<ErrorMemory> {
  constructor(client: GoogleSheetsClient) {
    super(client, "error_memory", "error_id", errorMemorySchema);
  }

  async active(): Promise<ErrorMemory[]> {
    return this.where((error) => error.active);
  }
}
