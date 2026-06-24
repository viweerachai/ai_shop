import { ContentPlan } from "../types/content.js";
import { currentWeekKey, nowIso } from "../utils/date.js";
import { createId } from "../utils/ids.js";
import { PlannedContent } from "../agents/contentPlannerAgent.js";

export function toContentRow(
  plan: PlannedContent,
  metadata?: { writerNote?: string; riskNote?: string }
): ContentPlan {
  const now = nowIso();
  return {
    content_id: createId("content"),
    week: currentWeekKey(),
    content_type: plan.content_type,
    theme: plan.theme,
    related_product_sku: plan.related_product_sku,
    target_platform: plan.target_platform,
    status: "ready_to_write",
    idea: plan.idea,
    caption_draft: "",
    hashtags: "",
    writer_note: metadata?.writerNote ?? "",
    content_key: `${plan.content_type}:${plan.related_product_sku}:${plan.theme}`.toLowerCase(),
    risk_note: metadata?.riskNote ?? "",
    final_risk_level: "low",
    qa_status: "",
    qa_score: 0,
    qa_issues: "",
    qa_note: "",
    manager_decision: "",
    rewrite_instruction: "",
    image_type: "",
    image_prompt: "",
    image_concept: "",
    image_text: "",
    image_note: "",
    image_status: "",
    publish_date: plan.publish_date,
    owner_status: "",
    created_at: now,
    updated_at: now,
    generated_image_url: "",
    generated_image_file: "",
    generated_image_provider: "",
    generated_image_model: "",
    generated_image_prompt: "",
    generated_image_at: "",
    image_approval_status: ""
  };
}

type PrioritySortOptions<T> = {
  ceoPrioritySkus?: string[];
  marketingFocusSkus?: string[];
  getSku?: (product: T) => string;
};

export function prioritySort<T extends {
  is_new_arrival: boolean;
  launch_post_done: boolean;
  publish_priority: number | null;
  content_used_count: number | null;
  last_content_date: string;
}>(
  products: T[],
  options?: PrioritySortOptions<T>
): T[] {
  const getSku = options?.getSku ?? ((product: T) => (product as T & { sku?: string }).sku ?? "");
  const ceoPriority = new Set(options?.ceoPrioritySkus ?? []);
  const marketingFocus = new Set(options?.marketingFocusSkus ?? []);
  return [...products].sort((a, b) => {
    const ceoA = ceoPriority.has(getSku(a)) ? 1 : 0;
    const ceoB = ceoPriority.has(getSku(b)) ? 1 : 0;
    const marketingA = marketingFocus.has(getSku(a)) ? 1 : 0;
    const marketingB = marketingFocus.has(getSku(b)) ? 1 : 0;
    const launchA = a.is_new_arrival && !a.launch_post_done ? 1 : 0;
    const launchB = b.is_new_arrival && !b.launch_post_done ? 1 : 0;
    return (
      ceoB - ceoA ||
      marketingB - marketingA ||
      launchB - launchA ||
      (b.publish_priority ?? 0) - (a.publish_priority ?? 0) ||
      (a.content_used_count ?? 0) - (b.content_used_count ?? 0) ||
      a.last_content_date.localeCompare(b.last_content_date)
    );
  });
}
