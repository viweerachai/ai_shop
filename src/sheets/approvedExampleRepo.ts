import { z } from "zod";
import { BaseSheetRepo } from "./baseRepo.js";
import { GoogleSheetsClient } from "./googleSheetsClient.js";

export const approvedExampleSchema = z.object({
  example_id: z.string(),
  type: z.string(),
  content: z.string(),
  note: z.string().default(""),
  active: z.coerce.string().transform((value) => !["false", "0", "no", ""].includes(value.toLowerCase())),
  created_at: z.string()
});
export type ApprovedExample = z.infer<typeof approvedExampleSchema>;

export class ApprovedExampleRepo extends BaseSheetRepo<ApprovedExample> {
  constructor(client: GoogleSheetsClient) {
    super(client, "approved_examples", "example_id", approvedExampleSchema);
  }

  async active(): Promise<ApprovedExample[]> {
    return this.where((example) => example.active);
  }
}
