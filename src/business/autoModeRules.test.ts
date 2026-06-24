import { beforeEach, describe, expect, it } from "vitest";
import { decideFinalStatus } from "./autoModeRules.js";
import { updateSystemSettings } from "../runtime/systemSettings.js";
import { ContentPlan } from "../types/content.js";

const content: ContentPlan = {
  content_id: "c1",
  week: "2026-W25",
  content_type: "knowledge",
  theme: "วิธีดูแลฟิกเกอร์",
  related_product_sku: "SKU-1",
  target_platform: "facebook",
  status: "manager_final_check",
  idea: "",
  caption_draft: "",
  hashtags: "",
  writer_note: "",
  content_key: "knowledge:sku-1",
  risk_note: "",
  final_risk_level: "low",
  qa_status: "passed",
  qa_score: 95,
  qa_issues: "",
  qa_note: "",
  manager_decision: "",
  rewrite_instruction: "",
  image_type: "product_photo",
  image_prompt: "",
  image_concept: "",
  image_text: "",
  image_note: "",
  image_status: "image_brief_ready",
  publish_date: "",
  owner_status: "",
  created_at: "",
  updated_at: ""
};

describe("auto mode final decision", () => {
  beforeEach(() => {
    updateSystemSettings({
      autoMode: "trusted_auto",
      autoPublish: false,
      minScore: 90,
      maxRisk: "low"
    });
  });

  it("allows high-score low-risk content to become ready", () => {
    expect(decideFinalStatus(content).status).toBe("ready_to_post");
  });

  it("requires owner review for promotion content", () => {
    expect(decideFinalStatus({ ...content, content_type: "promotion" }).status)
      .toBe("owner_review_required");
  });

  it("sends low-score content back for rewrite", () => {
    expect(decideFinalStatus({ ...content, qa_score: 89 }).status).toBe("needs_rewrite");
  });

  it("requires owner review in semi-auto mode", () => {
    updateSystemSettings({ autoMode: "semi_auto" });
    expect(decideFinalStatus(content).status).toBe("owner_review_required");
  });
});
