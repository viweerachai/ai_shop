import { z } from "zod";
import { GeminiClient } from "../ai/geminiClient.js";
import { Repos } from "../sheets/repos.js";
import { ProcessedProduct } from "../types/product.js";
import { TrendSignal } from "../types/trendSignal.js";
import { runAgent } from "./helpers.js";

const suggestionSchema = z.object({
  promo_type: z.enum(["discount", "bundle", "addon", "freegift", "clearance", "limited_campaign"]),
  related_product_sku: z.string(),
  bundle_sku: z.string().default(""),
  discount_type: z.string().default(""),
  discount_value: z.string().default(""),
  start_date: z.string().default(""),
  end_date: z.string().default(""),
  reason: z.string(),
  expected_goal: z.string(),
  risk_note: z.string(),
  manager_note: z.string()
});
const schema = z.object({ suggestions: z.array(suggestionSchema).max(20) });

export async function suggestPromotions(
  repos: Repos,
  gemini: GeminiClient,
  input: {
    products: ProcessedProduct[];
    strategy?: unknown;
    campaign?: unknown;
    salesSummary?: unknown;
    trendSignals?: TrendSignal[];
  }
) {
  const result = await runAgent(repos, gemini, {
    promptName: "salesAnalyst",
    ruleTypes: ["promotion_rule", "marketing_rule", "ceo_rule"],
    input,
    schema,
    outputShape:
      '{"suggestions":[{"promo_type":"discount|bundle|addon|freegift|clearance|limited_campaign","related_product_sku":"sku","bundle_sku":"","discount_type":"","discount_value":"","start_date":"","end_date":"","reason":"string","expected_goal":"string","risk_note":"string","manager_note":"string"}]}'
  });
  const bySku = new Map(input.products.map((product) => [product.sku, product]));
  return result.suggestions.map((suggestion) => {
    const product = bySku.get(suggestion.related_product_sku);
    if (product && (product.cost_price === null || product.margin_percent === null)) {
      return {
        ...suggestion,
        promo_type: ["bundle", "addon", "freegift"].includes(suggestion.promo_type)
          ? suggestion.promo_type
          : "bundle" as const,
        discount_type: "",
        discount_value: "",
        risk_note: `${suggestion.risk_note} ไม่มีข้อมูลต้นทุนหรือ margin จึงไม่เสนอส่วนลดแรง`.trim()
      };
    }
    return suggestion;
  });
}
