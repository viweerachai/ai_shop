import { z } from "zod";
import { GeminiClient } from "../ai/geminiClient.js";
import { Repos } from "../sheets/repos.js";
import { RawProduct } from "../types/product.js";
import { runAgent } from "./helpers.js";

export const productSpecialistOutputSchema = z.object({
  category: z.string(),
  product_type: z.string(),
  is_blind_box: z.boolean(),
  is_preorder: z.boolean(),
  is_new_arrival: z.boolean(),
  arrival_date: z.string(),
  publish_priority: z.number().min(0).max(100),
  launch_post_needed: z.boolean(),
  available_assets: z.array(z.string()),
  asset_note: z.string(),
  can_make_unboxing: z.boolean(),
  can_make_review: z.boolean(),
  can_make_product_showcase: z.boolean(),
  risk_level: z.enum(["low", "medium", "high"]),
  risk_note: z.string(),
  missing_fields: z.array(z.string())
});

export async function analyzeProduct(
  repos: Repos,
  gemini: GeminiClient,
  product: RawProduct
) {
  const result = await runAgent(repos, gemini, {
    promptName: "productSpecialist",
    ruleTypes: ["product_rule"],
    input: product,
    schema: productSpecialistOutputSchema,
    outputShape: JSON.stringify({
      category: "string",
      product_type: "string",
      is_blind_box: false,
      is_preorder: false,
      is_new_arrival: true,
      arrival_date: "YYYY-MM-DD or empty",
      publish_priority: 0,
      launch_post_needed: true,
      available_assets: ["product_photo"],
      asset_note: "string",
      can_make_unboxing: false,
      can_make_review: false,
      can_make_product_showcase: true,
      risk_level: "low|medium|high",
      risk_note: "string",
      missing_fields: []
    })
  });
  return {
    ...result,
    can_make_unboxing: false,
    publish_priority: result.is_new_arrival
      ? Math.max(70, result.publish_priority)
      : result.publish_priority
  };
}
