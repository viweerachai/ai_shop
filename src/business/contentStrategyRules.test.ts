import { describe, expect, it } from "vitest";
import { deriveContentStrategyFlags, deriveContentStrategyLabels } from "./contentStrategyRules.js";

describe("content strategy rules", () => {
  it("detects strategy signals from content notes", () => {
    const content = {
      content_type: "promotion",
      writer_note: "CEO priority product | Campaign: New Arrival Collector Week | Launch support content",
      risk_note: "Promotion requires owner approval | Guardrail: preorder ต้องย้ำเงื่อนไขให้ชัด | Guardrail: ห้ามใช้ถ้อยคำสื่อว่าเลือกลายได้"
    };

    const flags = deriveContentStrategyFlags(content);
    expect(flags.isCeoPriority).toBe(true);
    expect(flags.isCampaignDriven).toBe(true);
    expect(flags.isLaunchSupport).toBe(true);
    expect(flags.requiresPromotionApproval).toBe(true);
    expect(flags.hasPreorderGuardrail).toBe(true);
    expect(flags.hasBlindBoxGuardrail).toBe(true);

    expect(deriveContentStrategyLabels(content)).toEqual([
      "CEO priority",
      "Campaign brief",
      "Launch support",
      "Owner approval",
      "Preorder guardrail",
      "Blind box guardrail"
    ]);
  });
});
