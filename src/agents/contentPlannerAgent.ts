import { z } from "zod";
import { GeminiClient } from "../ai/geminiClient.js";
import { Repos } from "../sheets/repos.js";
import { ProcessedProduct } from "../types/product.js";
import { TrendSignal } from "../types/trendSignal.js";
import { runAgent } from "./helpers.js";

export const plannedContentSchema = z.object({
  content_type: z.string(),
  theme: z.string(),
  related_product_sku: z.string(),
  target_platform: z.string(),
  idea: z.string(),
  publish_date: z.string().default("")
});
export type PlannedContent = z.infer<typeof plannedContentSchema>;
const schema = z.object({ plans: z.array(plannedContentSchema).max(20) });

export async function planContent(
  repos: Repos,
  gemini: GeminiClient,
  input: {
    products: ProcessedProduct[];
    existingContentKeys: string[];
    count: number;
    strategy?: unknown;
    campaign?: unknown;
    trendSignals?: TrendSignal[];
  }
) {
  const result = await runAgent(repos, gemini, {
    promptName: "contentPlanner",
    ruleTypes: ["content_planner_rule", "marketing_rule"],
    input,
    schema,
    outputShape:
      '{"plans":[{"content_type":"string","theme":"string","related_product_sku":"string","target_platform":"string","idea":"string","publish_date":"YYYY-MM-DD or empty"}]}'
  });
  const products = new Map(input.products.map((product) => [product.sku, product]));
  return result.plans.filter((plan) => {
    if (/unbox/i.test(plan.content_type)) return false;
    const product = products.get(plan.related_product_sku);
    if (/review/i.test(plan.content_type) && !product?.can_make_review) return false;
    return !input.existingContentKeys.includes(
      `${plan.content_type}:${plan.related_product_sku}:${plan.theme}`.toLowerCase()
    );
  });
}
