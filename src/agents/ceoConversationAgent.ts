import { z } from "zod";
import { JsonAiClient } from "../ai/jsonAiClient.js";
import { Repos } from "../sheets/repos.js";
import { runAgent } from "./helpers.js";

export const ceoConversationActionSchema = z.object({
  title: z.string(),
  owner: z.enum(["CEO", "Marketing", "Manager", "Owner"]).default("Marketing"),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  status: z.enum(["ready", "in_progress", "completed", "watch", "blocked"]).default("ready"),
  reason: z.string(),
  source: z.enum(["sales", "content", "promotion", "operations"]).default("operations"),
  sku: z.string().optional().default("")
});

export const ceoConversationSchema = z.object({
  answer: z.string(),
  confidence: z.enum(["low", "medium", "high"]).default("medium"),
  data_gaps: z.array(z.string()).default([]),
  proposed_actions: z.array(ceoConversationActionSchema).default([]),
  rule_suggestion: z.string().optional().default("")
});

export type CeoConversationResult = z.infer<typeof ceoConversationSchema>;
export type CeoConversationAction = z.infer<typeof ceoConversationActionSchema>;

export async function createCeoConversationReply(
  repos: Repos,
  client: JsonAiClient,
  input: unknown
): Promise<CeoConversationResult> {
  return runAgent(repos, client, {
    promptName: "ceoConversation",
    ruleTypes: ["ceo_rule", "marketing_rule", "promotion_rule"],
    input,
    schema: ceoConversationSchema,
    outputShape:
      '{"answer":"string","confidence":"low|medium|high","data_gaps":["string"],"proposed_actions":[{"title":"string","owner":"CEO|Marketing|Manager|Owner","priority":"high|medium|low","status":"ready|watch|blocked","reason":"string","source":"sales|content|promotion|operations","sku":"optional sku"}],"rule_suggestion":"optional ceo_rule string"}'
  });
}
