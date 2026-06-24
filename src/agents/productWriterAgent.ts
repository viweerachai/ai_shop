import { z } from "zod";
import { GeminiClient } from "../ai/geminiClient.js";
import { Repos } from "../sheets/repos.js";
import { ProcessedProduct } from "../types/product.js";
import { runAgent } from "./helpers.js";

const schema = z.object({
  title_th: z.string().min(1),
  short_description: z.string().min(1),
  long_description: z.string().min(1),
  keywords: z.array(z.string())
});

export async function writeProductText(
  repos: Repos,
  gemini: GeminiClient,
  product: ProcessedProduct
) {
  return runAgent(repos, gemini, {
    promptName: "productWriter",
    ruleTypes: ["product_rule", "content_writer_rule"],
    input: product,
    schema,
    outputShape:
      '{"title_th":"string","short_description":"string","long_description":"string","keywords":["string"]}'
  });
}
