import { describe, expect, it } from "vitest";
import { createImagePlanView } from "./imagePlanService.js";
import { createActionImagePlanView } from "./strategyArtifacts.js";
import { ContentPlan } from "../types/content.js";
import { ProcessedProduct } from "../types/product.js";
import { StrategyActionArtifact } from "../types/strategyAction.js";

const content: ContentPlan = {
  content_id: "c1", week: "", content_type: "new_arrival", theme: "สินค้าใหม่",
  related_product_sku: "SKU-1", target_platform: "Instagram",
  status: "manager_final_check", idea: "", caption_draft: "", hashtags: "",
  writer_note: "", content_key: "", risk_note: "", final_risk_level: "low",
  qa_status: "passed", qa_score: 95, qa_issues: "", qa_note: "",
  manager_decision: "", rewrite_instruction: "", image_type: "product_photo",
  image_prompt: "", image_concept: "ภาพสินค้า", image_text: "NEW",
  image_note: "ใช้ภาพจริง", image_status: "image_brief_ready",
  publish_date: "", owner_status: "", created_at: "", updated_at: ""
};
const product: ProcessedProduct = {
  product_id: "p1", sku: "SKU-1", title_th: "ฟิกเกอร์", short_description: "",
  long_description: "", keywords: "", category: "Figure", product_type: "figure",
  is_blind_box: false, is_preorder: false, is_new_arrival: true,
  arrival_date: "", stock: 1, cost_price: 500, selling_price: 1000,
  margin_percent: 50, publish_priority: 90, launch_post_needed: true,
  launch_post_done: false, available_assets: "product_photo, opened_photo",
  asset_note: "", can_make_unboxing: false, can_make_review: true,
  can_make_product_showcase: true, content_used_count: 0, last_content_date: "",
  risk_level: "low", risk_note: "", status: "product_ready",
  created_at: "", updated_at: ""
};

describe("image plan view", () => {
  it("combines image brief with real product assets", () => {
    const view = createImagePlanView(content, product);
    expect(view.imageType).toBe("product_photo");
    expect(view.availableAssets).toEqual(["product_photo", "opened_photo"]);
    expect(view.brandedProduct).toBe(true);
    expect(view.canMakeUnboxing).toBe(false);
  });

  it("maps completed action artifacts into image briefs", () => {
    const artifact: StrategyActionArtifact = {
      artifactId: "artifact-image",
      actionId: "review-chopper",
      kind: "content_plan",
      status: "done",
      title: "Content Brief: Chopper Review Push",
      summary: "แตกรีวิวต่อจากสินค้าที่มี opened photo",
      owner: "Marketing",
      sku: "SKU-1",
      platform: "Facebook",
      contentType: "review",
      createdAt: "2026-06-17T10:00:00.000Z",
      updatedAt: "2026-06-17T11:00:00.000Z"
    };

    const view = createActionImagePlanView(artifact, product);
    expect(view.imageStatus).toBe("image_brief_ready");
    expect(view.imageType).toBe("product_photo");
    expect(view.availableAssets).toContain("product_photo");
  });
});
