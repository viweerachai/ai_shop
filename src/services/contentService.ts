import { config } from "../config.js";
import { deriveContentStrategyLabels } from "../business/contentStrategyRules.js";
import { strategyActionStore } from "../runtime/strategyActionStore.js";
import { createRepos } from "../sheets/repos.js";
import { ContentPlan } from "../types/content.js";
import { ContentListResponse, ContentViewItem } from "../types/contentView.js";
import { getDemoContent } from "./demoContent.js";
import { liveOrDemo } from "./liveOrDemo.js";
import { createActionContentView, visibleActionArtifacts } from "./strategyArtifacts.js";

function splitIssues(value: string): string[] {
  return value.split("|").map((item) => item.trim()).filter(Boolean);
}

export function createContentView(
  content: ContentPlan,
  productName = ""
): ContentViewItem {
  return {
    id: content.content_id,
    week: content.week,
    contentType: content.content_type,
    theme: content.theme,
    productSku: content.related_product_sku,
    productName: productName || content.related_product_sku || "คอนเทนต์ทั่วไป",
    platform: content.target_platform,
    status: content.status,
    idea: content.idea,
    caption: content.caption_draft,
    hashtags: content.hashtags.split(/\s+/).filter(Boolean),
    writerNote: content.writer_note,
    strategyLabels: deriveContentStrategyLabels(content),
    riskNote: content.risk_note,
    riskLevel: content.final_risk_level,
    qaStatus: content.qa_status,
    qaScore: content.qa_score,
    qaIssues: splitIssues(content.qa_issues),
    qaNote: content.qa_note,
    rewriteInstruction: content.rewrite_instruction,
    imageStatus: content.image_status,
    ownerStatus: content.owner_status,
    publishDate: content.publish_date,
    updatedAt: content.updated_at || content.created_at
  };
}

export async function getContentView(): Promise<ContentListResponse> {
  return liveOrDemo(loadLiveContent, getDemoContent, "content");
}

async function loadLiveContent(): Promise<ContentListResponse> {
  const repos = createRepos();
  const [content, products] = await Promise.all([
    repos.contentPlans.all(),
    repos.processedProducts.all()
  ]);
  const productNames = new Map(
    products.map((product) => [product.sku, product.title_th || product.sku])
  );
  const items = content
    .map((item) => createContentView(item, productNames.get(item.related_product_sku)))
    .concat(
      visibleActionArtifacts(strategyActionStore.snapshot().recentArtifacts)
        .filter((artifact) => artifact.kind === "content_plan")
        .map((artifact) =>
          createActionContentView(
            artifact,
            products.find((product) => product.sku === artifact.sku)
          )
        )
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return {
    mode: "live",
    summary: {
      total: items.length,
      readyToWrite: items.filter((item) => item.status === "ready_to_write").length,
      waitingQa: items.filter((item) => item.status === "content_ready_for_qa").length,
      needsRewrite: items.filter((item) => item.status === "needs_rewrite").length,
      ownerReview: items.filter((item) => item.status === "owner_review_required").length,
      readyToPost: items.filter((item) => item.status === "ready_to_post").length
    },
    content: items
  };
}
