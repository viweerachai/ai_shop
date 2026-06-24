import { z } from "zod";
import { JsonAiClient } from "../ai/jsonAiClient.js";
import { Repos } from "../sheets/repos.js";
import { runAgent } from "./helpers.js";

const schema = z.object({
  shop_priority: z.string(),
  priority_products: z.array(z.string()),
  focus_categories: z.array(z.string()),
  weekly_direction: z.string(),
  instruction_to_marketing: z.string(),
  instruction_to_manager: z.string()
});

export async function createCeoStrategy(repos: Repos, client: JsonAiClient, input: unknown) {
  return runAgent(repos, client, {
    promptName: "ceo",
    ruleTypes: ["ceo_rule"],
    input,
    schema,
    outputShape:
      '{"shop_priority":"string","priority_products":["sku"],"focus_categories":["string"],"weekly_direction":"string","instruction_to_marketing":"string","instruction_to_manager":"string"}'
  });
}
