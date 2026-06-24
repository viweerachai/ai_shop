import { z } from "zod";
import { GeminiClient } from "../ai/geminiClient.js";
import { Repos } from "../sheets/repos.js";
import { runAgent } from "./helpers.js";

const schema = z.object({
  decision: z.enum(["approve", "rewrite", "owner_review"]),
  instruction: z.string(),
  risk_note: z.string()
});

export async function managerReview(repos: Repos, gemini: GeminiClient, input: unknown) {
  return runAgent(repos, gemini, {
    promptName: "manager",
    ruleTypes: ["manager_rule"],
    input,
    schema,
    outputShape:
      '{"decision":"approve|rewrite|owner_review","instruction":"string","risk_note":"string"}'
  });
}
