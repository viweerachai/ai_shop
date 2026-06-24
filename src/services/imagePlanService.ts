import { config } from "../config.js";
import { strategyActionStore } from "../runtime/strategyActionStore.js";
import { createRepos } from "../sheets/repos.js";
import { ContentPlan } from "../types/content.js";
import { ImagePlanResponse, ImagePlanViewItem } from "../types/imagePlanView.js";
import { ProcessedProduct } from "../types/product.js";
import { ProductAssetView } from "../types/productAsset.js";
import { getDemoImagePlans } from "./demoImagePlans.js";
import { liveOrDemo } from "./liveOrDemo.js";
import { createActionImagePlanView, visibleActionArtifacts } from "./strategyArtifacts.js";
import { loadProductAssetMap } from "./productAssetService.js";

function assets(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function createImagePlanView(
  content: ContentPlan,
  product?: ProcessedProduct,
  productAsset?: ProductAssetView
): ImagePlanViewItem {
  const category = `${product?.category ?? ""} ${product?.product_type ?? ""}`.toLowerCase();
  const availableAssets = productAsset?.availableAssets?.length
    ? productAsset.availableAssets
    : assets(product?.available_assets ?? "");
  return {
    id: content.content_id,
    theme: content.theme,
    contentType: content.content_type,
    productSku: content.related_product_sku,
    productName: product?.title_th || content.related_product_sku || "คอนเทนต์ทั่วไป",
    platform: content.target_platform,
    imageType:
      content.image_type === "template" ||
      content.image_type === "product_photo" ||
      content.image_type === "ai_image"
        ? content.image_type
        : "",
    imageConcept: content.image_concept,
    imageText: content.image_text,
    imagePrompt: content.image_prompt,
    imageNote: content.image_note,
    imageStatus: content.image_status,
    generatedImageUrl: content.generated_image_url,
    generatedImageFile: content.generated_image_file,
    generatedImageProvider: content.generated_image_provider,
    generatedImageModel: content.generated_image_model,
    generatedImagePrompt: content.generated_image_prompt,
    generatedImageAt: content.generated_image_at,
    imageApprovalStatus: content.image_approval_status,
    availableAssets,
    assetNote: productAsset?.assetNote ?? product?.asset_note ?? "",
    assetSource: productAsset?.source ?? (product?.available_assets ? "sheet" : "fallback"),
    driveFolderId: productAsset?.driveFolderId,
    driveFolderUrl: productAsset?.driveFolderUrl,
    driveAssetCount: productAsset?.assetCount,
    driveFiles: productAsset?.files,
    brandedProduct: /figure|collectible|character|licensed|brand|blind_box/.test(category),
    canMakeUnboxing: product?.can_make_unboxing ?? false,
    status: content.status,
    riskLevel: content.final_risk_level,
    updatedAt: content.updated_at || content.created_at
  };
}

export async function getImagePlans(): Promise<ImagePlanResponse> {
  return liveOrDemo(loadLiveImagePlans, getDemoImagePlans, "image plans");
}

async function loadLiveImagePlans(): Promise<ImagePlanResponse> {
  const repos = createRepos();
  const [content, products] = await Promise.all([
    repos.contentPlans.all(),
    repos.processedProducts.all()
  ]);
  const assetMap = await loadProductAssetMap();
  const bySku = new Map(products.map((product) => [product.sku, product]));
  const plans = content
    .filter((item) =>
      Boolean(item.image_status) ||
      ["content_passed", "manager_final_check", "ready_to_post", "owner_review_required"].includes(item.status)
    )
    .map((item) => createImagePlanView(item, bySku.get(item.related_product_sku), assetMap.get(item.related_product_sku)))
    .concat(
      visibleActionArtifacts(strategyActionStore.snapshot().recentArtifacts)
        .filter((artifact) => artifact.kind === "content_plan")
        .map((artifact) =>
          createActionImagePlanView(
            artifact,
            bySku.get(artifact.sku || ""),
            assetMap.get(artifact.sku || "")
          )
        )
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return {
    mode: "live",
    summary: {
      total: plans.length,
      waiting: plans.filter((plan) => !plan.imageStatus).length,
      ready: plans.filter((plan) => ["image_brief_ready", "image_generated"].includes(plan.imageStatus)).length,
      productPhoto: plans.filter((plan) => plan.imageType === "product_photo").length,
      template: plans.filter((plan) => plan.imageType === "template").length,
      aiImage: plans.filter((plan) => plan.imageType === "ai_image").length
    },
    plans
  };
}
