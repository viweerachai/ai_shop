import { z } from "zod";
import { GeminiClient } from "../ai/geminiClient.js";
import { Repos } from "../sheets/repos.js";
import { ContentPlan } from "../types/content.js";
import { ProcessedProduct } from "../types/product.js";
import { runAgent } from "./helpers.js";

const schema = z.object({
  image_type: z.enum(["template", "product_photo", "ai_image"]),
  image_prompt: z.string(),
  image_concept: z.string(),
  image_text: z.string(),
  image_note: z.string()
});

export async function planImage(
  repos: Repos,
  gemini: GeminiClient,
  plan: ContentPlan,
  product?: ProcessedProduct
) {
  const result = await runAgent(repos, gemini, {
    promptName: "imageCreative",
    ruleTypes: ["image_rule"],
    input: { plan, product },
    schema,
    outputShape:
      '{"image_type":"template|product_photo|ai_image","image_prompt":"string","image_concept":"string","image_text":"string","image_note":"string"}'
  });
  const isBranded = Boolean(product?.category.match(/collectible|figure|character|licensed|brand/i));
  if (product && (isBranded || product.available_assets.includes("product"))) {
    return {
      ...result,
      image_type: "product_photo" as const,
      image_prompt: "",
      image_note: `${result.image_note} ใช้ภาพสินค้าจริงร่วมกับเทมเพลตเท่านั้น`.trim()
    };
  }
  return result;
}
