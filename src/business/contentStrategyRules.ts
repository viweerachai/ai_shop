import { ContentPlan } from "../types/content.js";

export interface ContentStrategyFlags {
  isCeoPriority: boolean;
  isCampaignDriven: boolean;
  isLaunchSupport: boolean;
  requiresPromotionApproval: boolean;
  hasBlindBoxGuardrail: boolean;
  hasPreorderGuardrail: boolean;
}

export function deriveContentStrategyFlags(
  content: Pick<ContentPlan, "content_type" | "writer_note" | "risk_note">
): ContentStrategyFlags {
  const writerNote = content.writer_note.toLowerCase();
  const riskNote = content.risk_note.toLowerCase();
  return {
    isCeoPriority: writerNote.includes("ceo priority product"),
    isCampaignDriven: writerNote.includes("campaign:") || writerNote.includes("campaign support product"),
    isLaunchSupport: writerNote.includes("launch support content"),
    requiresPromotionApproval:
      riskNote.includes("owner approval") || ["promotion", "sale", "bundle"].includes(content.content_type),
    hasBlindBoxGuardrail: riskNote.includes("เลือกลายได้") || riskNote.includes("blind box"),
    hasPreorderGuardrail: riskNote.includes("preorder")
  };
}

export function deriveContentStrategyLabels(
  content: Pick<ContentPlan, "content_type" | "writer_note" | "risk_note">
): string[] {
  const flags = deriveContentStrategyFlags(content);
  return [
    flags.isCeoPriority ? "CEO priority" : "",
    flags.isCampaignDriven ? "Campaign brief" : "",
    flags.isLaunchSupport ? "Launch support" : "",
    flags.requiresPromotionApproval ? "Owner approval" : "",
    flags.hasPreorderGuardrail ? "Preorder guardrail" : "",
    flags.hasBlindBoxGuardrail ? "Blind box guardrail" : ""
  ].filter(Boolean);
}
