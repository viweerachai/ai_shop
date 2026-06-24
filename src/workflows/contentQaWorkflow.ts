import { qaContent } from "../agents/qaRiskAgent.js";
import { deriveContentStrategyFlags } from "../business/contentStrategyRules.js";
import { nowIso } from "../utils/date.js";
import { createId } from "../utils/ids.js";
import { logger } from "../utils/logger.js";
import { WorkflowContext } from "./context.js";

export async function contentQaWorkflow({ repos, gemini }: WorkflowContext) {
  const [plans, allPlans, products] = await Promise.all([
    repos.contentPlans.where((plan) => plan.status === "content_ready_for_qa"),
    repos.contentPlans.all(),
    repos.processedProducts.all()
  ]);
  const bySku = new Map(products.map((product) => [product.sku, product]));
  logger.info({ count: plans.length }, "Checking content");
  for (const plan of plans) {
    const product = bySku.get(plan.related_product_sku);
    const flags = deriveContentStrategyFlags(plan);
    const qa = await qaContent(
      repos,
      gemini,
      plan,
      product,
      allPlans.filter((item) => item.content_id !== plan.content_id).map((item) => item.content_key)
    );
    let qaStatus = qa.qa_status;
    let managerDecision = qa.manager_decision;
    const qaIssues = [...qa.qa_issues];
    const qaNotes = [qa.qa_note].filter(Boolean);
    let status =
      qa.qa_status === "passed" && qa.qa_score >= 90
        ? "content_passed"
        : qa.qa_status === "risky"
          ? "owner_review_required"
          : "needs_rewrite";

    if (
      qa.qa_status === "passed" &&
      ((flags.isCeoPriority && qa.qa_score < 95) ||
        flags.requiresPromotionApproval ||
        (flags.isCampaignDriven && qa.qa_score < 92))
    ) {
      qaStatus = "risky";
      managerDecision = "owner_review";
      status = "owner_review_required";
      if (flags.isCeoPriority && qa.qa_score < 95) {
        qaIssues.push("CEO-priority content should receive owner review before posting");
        qaNotes.push("โพสต์นี้เป็นสินค้าที่ CEO กำลังดัน แม้ QA ผ่าน แต่ควรให้เจ้าของร้านตรวจซ้ำก่อน");
      }
      if (flags.requiresPromotionApproval) {
        qaNotes.push("โพสต์นี้เกี่ยวข้องกับโปรโมชั่นหรือมี guardrail ที่ต้องให้ owner review");
      }
      if (flags.isCampaignDriven && qa.qa_score < 92) {
        qaNotes.push("โพสต์อยู่ใน campaign หลักและคะแนนยังไม่แข็งพอสำหรับปล่อยตรง");
      }
    }

    const riskLevel =
      qaStatus === "risky" || product?.risk_level === "high"
        ? "high"
        : qaIssues.length > 0
          ? "medium"
          : "low";
    await repos.contentPlans.upsert([{
      ...plan,
      ...qa,
      qa_status: qaStatus,
      manager_decision: managerDecision,
      qa_issues: qaIssues.join(" | "),
      qa_note: qaNotes.join(" "),
      final_risk_level: riskLevel,
      status,
      updated_at: nowIso()
    }]);
    if (qa.qa_status !== "passed" && qa.rewrite_instruction) {
      await repos.errorMemory.append([{
        error_id: createId("err"),
        source: `content:${plan.content_id}`,
        error_type: qa.qa_issues[0] ?? "content_qa",
        description: qa.qa_note,
        correction_rule: qa.rewrite_instruction,
        example_bad: plan.caption_draft,
        example_good: "",
        active: true,
        created_at: nowIso()
      }]);
    }
  }
  return { checked: plans.length };
}
