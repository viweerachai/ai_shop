import { z } from "zod";
import { GeminiClient } from "../ai/geminiClient.js";
import { Repos } from "../sheets/repos.js";
import { ProcessedProduct } from "../types/product.js";
import { runAgent } from "./helpers.js";

const schema = z.object({
  passed: z.boolean(),
  score: z.number().min(0).max(100),
  issues: z.array(z.string()),
  risk_level: z.enum(["low", "medium", "high"]),
  note: z.string(),
  correction_rule: z.string().default("")
});

export async function qaProductText(
  repos: Repos,
  gemini: GeminiClient,
  product: ProcessedProduct
) {
  return runAgent(repos, gemini, {
    promptName: "productQa",
    ruleTypes: ["product_rule", "qa_rule"],
    input: product,
    schema,
    outputShape:
      '{"passed":true,"score":0,"issues":[],"risk_level":"low|medium|high","note":"string","correction_rule":"string"}'
  });
}
