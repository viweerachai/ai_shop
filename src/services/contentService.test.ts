import { describe, expect, it } from "vitest";
import { createContentView } from "./contentService.js";
import { createActionContentView } from "./strategyArtifacts.js";
import { ContentPlan } from "../types/content.js";
import { StrategyActionArtifact } from "../types/strategyAction.js";

const content: ContentPlan = {
  content_id: "c1",
  week: "2026-W25",
  content_type: "new_arrival",
  theme: "สินค้าใหม่",
  related_product_sku: "SKU-1",
  target_platform: "Facebook",
  status: "needs_rewrite",
  idea: "เปิดตัวสินค้า",
  caption_draft: "ข้อความ",
  hashtags: "#New #Collectible",
  writer_note: "CEO priority product | Campaign: New Arrival Collector Week",
  content_key: "new:sku-1",
  risk_note: "Guardrail: ห้ามใช้ถ้อยคำสื่อว่าเลือกลายได้",
  final_risk_level: "medium",
  qa_status: "failed",
  qa_score: 70,
  qa_issues: "Blind box warning missing | Duplicate topic",
  qa_note: "",
  manager_decision: "rewrite",
  rewrite_instruction: "เพิ่มคำเตือน",
  image_type: "",
  image_prompt: "",
  image_concept: "",
  image_text: "",
  image_note: "",
  image_status: "",
  publish_date: "",
  owner_status: "",
  created_at: "",
  updated_at: ""
};

describe("content view", () => {
  it("maps sheet content into a UI-safe shape", () => {
    const view = createContentView(content, "สินค้าทดสอบ");
    expect(view.productName).toBe("สินค้าทดสอบ");
    expect(view.hashtags).toEqual(["#New", "#Collectible"]);
    expect(view.qaIssues).toEqual(["Blind box warning missing", "Duplicate topic"]);
    expect(view.riskLevel).toBe("medium");
    expect(view.strategyLabels).toContain("CEO priority");
    expect(view.strategyLabels).toContain("Campaign brief");
    expect(view.strategyLabels).toContain("Blind box guardrail");
  });

  it("maps action artifacts into content queue items", () => {
    const artifact: StrategyActionArtifact = {
      artifactId: "artifact-1",
      actionId: "hero-sonny",
      kind: "content_plan",
      status: "open",
      title: "Content Brief: Sonny Hero Launch",
      summary: "เปิดตัวสินค้าขายดีประจำสัปดาห์",
      owner: "Marketing",
      sku: "SKU-1",
      platform: "Facebook, Instagram",
      contentType: "new_arrival",
      createdAt: "2026-06-17T10:00:00.000Z",
      updatedAt: "2026-06-17T10:00:00.000Z"
    };

    const view = createActionContentView(artifact);
    expect(view.status).toBe("ready_to_write");
    expect(view.strategyLabels).toEqual(expect.arrayContaining(["Action queue", "Marketing"]));
    expect(view.writerNote).toContain("hero-sonny");
  });
});
