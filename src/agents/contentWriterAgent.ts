import { z } from "zod";
import { GeminiClient } from "../ai/geminiClient.js";
import { Repos } from "../sheets/repos.js";
import { ContentPlan } from "../types/content.js";
import { ProcessedProduct } from "../types/product.js";
import { runAgent } from "./helpers.js";

const schema = z.object({
  caption_draft: z.string().min(1),
  hashtags: z.array(z.string()),
  writer_note: z.string(),
  content_key: z.string().min(1),
  risk_note: z.string()
});

export async function writeContent(
  repos: Repos,
  gemini: GeminiClient,
  plan: ContentPlan,
  product?: ProcessedProduct
) {
  return runAgent(repos, gemini, {
    promptName: "contentWriter",
    ruleTypes: ["content_writer_rule"],
    input: { plan, product },
    schema,
    outputShape:
      '{"caption_draft":"string","hashtags":["#tag"],"writer_note":"string","content_key":"unique-lowercase-key","risk_note":"string"}'
  });
}
