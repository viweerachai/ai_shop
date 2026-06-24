import { z } from "zod";
import { GeminiClient } from "../ai/geminiClient.js";
import { Repos } from "../sheets/repos.js";
import { runAgent } from "./helpers.js";

function asText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return String(value ?? "").trim();
  const record = value as Record<string, unknown>;
  const candidates = [
    record.text,
    record.title,
    record.name,
    record.idea,
    record.content,
    record.value,
    record.description
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeList(values: unknown[]): string[] {
  return values.map(asText).filter(Boolean);
}

const schema = z.object({
  campaign_name: z.string(),
  target_customer: z.string(),
  key_message: z.string(),
  content_mix: z.array(z.unknown()).transform(normalizeList),
  product_focus: z.array(z.unknown()).transform(normalizeList),
  recommended_content_ideas: z.array(z.unknown()).transform(normalizeList),
  promotion_ideas: z.array(z.unknown()).transform(normalizeList),
  warning_rules: z.array(z.unknown()).transform(normalizeList)
});

export async function createMarketingCampaign(
  repos: Repos,
  gemini: GeminiClient,
  input: unknown
) {
  return runAgent(repos, gemini, {
    promptName: "marketing",
    ruleTypes: ["marketing_rule"],
    input,
    schema,
    outputShape:
      '{"campaign_name":"string","target_customer":"string","key_message":"string","content_mix":["string"],"product_focus":["string"],"recommended_content_ideas":["string"],"promotion_ideas":["string"],"warning_rules":["string"]}'
  });
}
