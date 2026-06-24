import { z } from "zod";
import { GeminiClient } from "../ai/geminiClient.js";
import { Repos } from "../sheets/repos.js";
import { ContentPlan } from "../types/content.js";
import { ProcessedProduct } from "../types/product.js";
import { runAgent } from "./helpers.js";
import { deriveContentStrategyFlags } from "../business/contentStrategyRules.js";

const schema = z.object({
  qa_status: z.enum(["passed", "failed", "risky"]),
  qa_score: z.number().min(0).max(100),
  qa_issues: z.array(z.string()),
  qa_note: z.string(),
  manager_decision: z.enum(["approve", "rewrite", "owner_review"]),
  rewrite_instruction: z.string()
});

export async function qaContent(
  repos: Repos,
  gemini: GeminiClient,
  plan: ContentPlan,
  product: ProcessedProduct | undefined,
  existingContentKeys: string[]
) {
  const strategyFlags = deriveContentStrategyFlags(plan);
  const result = await runAgent(repos, gemini, {
    promptName: "qaRisk",
    ruleTypes: ["qa_rule", "manager_rule"],
    input: { plan, product, existingContentKeys, strategyFlags },
    schema,
    outputShape:
      '{"qa_status":"passed|failed|risky","qa_score":0,"qa_issues":[],"qa_note":"string","manager_decision":"approve|rewrite|owner_review","rewrite_instruction":"string"}'
  });
  const blindBoxMissingWarning =
    product?.is_blind_box &&
    !/(สุ่ม|ไม่สามารถเลือก|cannot select|random)/i.test(plan.caption_draft);
  if (blindBoxMissingWarning) {
    return {
      ...result,
      qa_status: "failed" as const,
      manager_decision: "rewrite" as const,
      qa_score: Math.min(result.qa_score, 60),
      qa_issues: [...result.qa_issues, "Blind box random/no-selection wording is missing"],
      rewrite_instruction: "ระบุชัดเจนว่าสินค้าเป็นแบบสุ่มและไม่สามารถเลือกลายได้"
    };
  }
  const preorderMissingTerms =
    strategyFlags.hasPreorderGuardrail &&
    !/(พรีออเดอร์|pre-?order|preorder|รอบส่งมอบ|จัดส่ง|เงื่อนไข)/i.test(plan.caption_draft);
  if (preorderMissingTerms) {
    return {
      ...result,
      qa_status: "failed" as const,
      manager_decision: "rewrite" as const,
      qa_score: Math.min(result.qa_score, 70),
      qa_issues: [...result.qa_issues, "Preorder conditions or fulfillment wording is missing"],
      qa_note: [result.qa_note, "โพสต์พรีออเดอร์ยังไม่อธิบายเงื่อนไขหรือรอบส่งมอบให้ชัดเจน"].filter(Boolean).join(" "),
      rewrite_instruction: "ระบุชัดเจนว่าเป็นพรีออเดอร์ พร้อมเงื่อนไขและรอบส่งมอบ"
    };
  }
  return result;
}
