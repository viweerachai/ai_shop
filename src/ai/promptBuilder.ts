import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { AgentContext } from "../types/agent.js";

const CORE_RULES = [
  "Never invent product facts or assets.",
  "Prioritize new arrivals before older products.",
  "This shop is collectible resale / buy-to-sell. Many SKUs have stock 1. Use active trend signals, inventory readiness, assets, margin, rarity/collector appeal, risk, and content freshness before sales history. Treat sales as a secondary signal.",
  "If stock is 1-2, do not recommend aggressive promotions or heavy sales-driven pushes; use limited showcase / ready-to-ship messaging instead.",
  "Never push stock 0 products for sale.",
  "Never imply a blind box design can be selected. State that designs are random and cannot be selected.",
  "Do not propose unboxing, opened-box reveal, or AI-generated opened-product content.",
  "Do not use aggressive sales language unless explicitly allowed.",
  "Promotions are suggestions only and must never be marked active or approved automatically.",
  "For branded collectibles, prefer real product photos and templates; do not invent branded character imagery.",
  "Return only JSON that matches the requested output shape."
];

export async function buildPrompt(
  promptName: string,
  input: unknown,
  context: AgentContext,
  outputShape: string
): Promise<string> {
  const template = await readFile(resolve(process.cwd(), "prompts", `${promptName}.md`), "utf8");
  return [
    template,
    "CORE BUSINESS RULES:",
    ...CORE_RULES.map((rule) => `- ${rule}`),
    "ACTIVE SHEET RULES:",
    ...(context.rules.length ? context.rules.map((rule) => `- ${rule}`) : ["- None"]),
    "PAST ERRORS TO AVOID:",
    ...(context.errors.length ? context.errors.map((rule) => `- ${rule}`) : ["- None"]),
    "OWNER-APPROVED EXAMPLES:",
    ...(context.approvedExamples.length
      ? context.approvedExamples.map((example) => `- ${example}`)
      : ["- None"]),
    `INPUT:\n${JSON.stringify(input, null, 2)}`,
    `OUTPUT JSON SHAPE:\n${outputShape}`
  ].join("\n\n");
}
