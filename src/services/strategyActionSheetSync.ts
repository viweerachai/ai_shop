import { strategyActionStore } from "../runtime/strategyActionStore.js";
import { createRepos } from "../sheets/repos.js";
import { nowIso } from "../utils/date.js";

function contentStatusForArtifact(status: "draft" | "open" | "done" | "canceled"): string {
  if (status === "done") return "content_ready_for_qa";
  if (status === "canceled") return "needs_rewrite";
  return "ready_to_write";
}

function promotionStatusForArtifact(status: "draft" | "open" | "done" | "canceled"): "suggested" | "approved" | "hold" {
  if (status === "done") return "approved";
  if (status === "canceled") return "hold";
  return "suggested";
}

export async function syncActionToSheets(actionId: string): Promise<void> {
  const artifact = strategyActionStore.snapshot().recentArtifacts.find((item) => item.actionId === actionId);
  if (!artifact) return;

  const repos = createRepos();

  if (artifact.kind === "content_plan") {
    await repos.contentPlans.upsert([{
      content_id: artifact.artifactId,
      week: new Date(artifact.createdAt).toISOString().slice(0, 10),
      content_type: artifact.contentType || "knowledge",
      theme: artifact.title,
      related_product_sku: artifact.sku || "",
      target_platform: artifact.platform || "Facebook",
      status: contentStatusForArtifact(artifact.status),
      idea: artifact.summary,
      caption_draft: "",
      hashtags: artifact.sku ? `#${artifact.sku.replace(/[^A-Za-z0-9]/g, "")}` : "",
      writer_note: `Generated from strategy action | ${artifact.actionId}`,
      content_key: `action:${artifact.actionId}`,
      risk_note: "",
      final_risk_level: artifact.status === "done" ? "low" : "medium",
      qa_status: artifact.status === "done" ? "pending" : "",
      qa_score: 0,
      qa_issues: "",
      qa_note: artifact.status === "done" ? "Action completed and ready for QA" : "",
      manager_decision: "",
      rewrite_instruction: "",
      image_type: "",
      image_prompt: "",
      image_concept: "",
      image_text: "",
      image_note: "",
      image_status: artifact.status === "done" ? "image_brief_ready" : "",
      publish_date: "",
      owner_status: artifact.status === "canceled" ? "canceled" : "",
      created_at: artifact.createdAt,
      updated_at: nowIso(),
      generated_image_url: "",
      generated_image_file: "",
      generated_image_provider: "",
      generated_image_model: "",
      generated_image_prompt: "",
      generated_image_at: "",
      image_approval_status: ""
    }]);
    return;
  }

  if (artifact.kind === "promotion_plan") {
    await repos.promotionPlans.upsert([{
      promo_id: artifact.artifactId,
      promo_type: artifact.promotionType || "bundle",
      related_product_sku: artifact.sku || "",
      bundle_sku: "",
      discount_type: "",
      discount_value: "",
      start_date: "",
      end_date: "",
      reason: artifact.summary,
      expected_goal: "Drive conversion from strategy action",
      risk_note: "",
      manager_note: `Generated from strategy action | ${artifact.actionId}`,
      status: promotionStatusForArtifact(artifact.status),
      created_by: `${artifact.owner} Action Queue`,
      created_at: artifact.createdAt,
      approved_at: artifact.status === "done" ? nowIso() : ""
    }]);
    return;
  }

  await repos.errorMemory.upsert([{
    error_id: artifact.artifactId,
    source: `strategy-action:${artifact.actionId}`,
    error_type: "stock_followup",
    description: artifact.title,
    correction_rule: artifact.summary,
    example_bad: "",
    example_good: "",
    active: artifact.status !== "done" && artifact.status !== "canceled",
    created_at: artifact.createdAt
  }]);
}
