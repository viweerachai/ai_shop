import { StrategyActionArtifact } from "../types/strategyAction.js";
import { ContentViewItem } from "../types/contentView.js";
import { PromotionViewItem, ApprovalViewItem } from "../types/promotionView.js";
import { ImagePlanViewItem } from "../types/imagePlanView.js";
import { ProcessedProduct } from "../types/product.js";
import { ProductAssetView } from "../types/productAsset.js";

function artifactRiskLevel(artifact: StrategyActionArtifact): "low" | "medium" | "high" {
  if (artifact.kind === "stock_followup") return "medium";
  return artifact.status === "done" ? "low" : "medium";
}

function artifactTimestamp(artifact: StrategyActionArtifact): string {
  return artifact.updatedAt || artifact.createdAt;
}

function defaultImageType(product?: ProcessedProduct): ImagePlanViewItem["imageType"] {
  if (!product) return "template";
  const assets = (product.available_assets || "").toLowerCase();
  if (assets.includes("product_photo")) return "product_photo";
  return /figure|collectible|blind_box|licensed|character/i.test(`${product.category} ${product.product_type}`)
    ? "template"
    : "ai_image";
}

function availableAssets(product?: ProcessedProduct): string[] {
  return (product?.available_assets || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function visibleActionArtifacts(artifacts: StrategyActionArtifact[]): StrategyActionArtifact[] {
  return artifacts.filter((artifact) => artifact.status !== "canceled");
}

export function createActionContentView(
  artifact: StrategyActionArtifact,
  product?: ProcessedProduct
): ContentViewItem {
  const done = artifact.status === "done";
  return {
    id: artifact.artifactId,
    week: new Date(artifact.createdAt).toLocaleDateString("en-CA").slice(0, 8).replace("-", "-W"),
    contentType: artifact.contentType || "knowledge",
    theme: artifact.title,
    productSku: artifact.sku || "",
    productName: product?.title_th || artifact.sku || "คอนเทนต์จาก Action Queue",
    platform: artifact.platform || "Facebook",
    status: done ? "content_ready_for_qa" : "ready_to_write",
    idea: artifact.summary,
    caption: "",
    hashtags: artifact.sku ? [`#${artifact.sku.replace(/[^A-Za-z0-9]/g, "")}`] : [],
    writerNote: `Generated from action queue | ${artifact.actionId}`,
    strategyLabels: ["Action queue", artifact.owner],
    riskNote: artifact.kind === "content_plan" ? "" : "ต้องตรวจความพร้อมก่อนปล่อยงาน",
    riskLevel: artifactRiskLevel(artifact),
    qaStatus: done ? "pending" : "",
    qaScore: 0,
    qaIssues: [],
    qaNote: done ? "Action ถูกทำเสร็จและรอ QA" : "",
    rewriteInstruction: "",
    imageStatus: done ? "image_brief_ready" : "",
    ownerStatus: "",
    publishDate: "",
    updatedAt: artifactTimestamp(artifact)
  };
}

export function createActionPromotionView(
  artifact: StrategyActionArtifact,
  product?: ProcessedProduct
): PromotionViewItem {
  const status = artifact.status === "done" ? "approved" : "suggested";
  const stock = product?.stock ?? null;
  const marginPercent = product?.margin_percent ?? null;
  return {
    id: artifact.artifactId,
    type: artifact.promotionType || "bundle",
    productSku: artifact.sku || "",
    productName: product?.title_th || artifact.title,
    bundleSku: "",
    discountType: "",
    discountValue: "",
    startDate: "",
    endDate: "",
    reason: artifact.summary,
    expectedGoal: "เร่ง conversion ตามคำสั่ง CEO/Marketing",
    riskNote: "",
    managerNote: "สร้างจาก action queue และต้องให้เจ้าของร้านเช็กอีกครั้ง",
    status,
    createdBy: `${artifact.owner} Action Queue`,
    createdAt: artifact.createdAt,
    approvedAt: artifact.status === "done" ? artifactTimestamp(artifact) : "",
    hasMarginData: marginPercent !== null,
    stock,
    stockLabel: stock === null ? "รอเช็ก stock" : stock <= 5 ? `ต่ำ (${stock})` : `พร้อมขาย (${stock})`,
    marginPercent,
    riskLevel: artifactRiskLevel(artifact),
    routeLabel: artifact.promotionType === "bundle" ? "Bundle pair" : "Promotion review",
    approvalReadiness: artifact.status === "done" ? "ready" : "needs_review",
    strategyLabels: ["Action queue", artifact.owner],
    decisionSummary: artifact.summary,
    watchouts: ["ตรวจเงื่อนไขโปรและ stock ก่อนสื่อสารจริง"],
    approvalBlockedReason: ""
  };
}

export function createActionApprovalView(artifact: StrategyActionArtifact): ApprovalViewItem {
  return {
    id: artifact.artifactId,
    kind: "promotion",
    title: artifact.title,
    subtitle: artifact.sku || "general",
    status: "suggested",
    riskLevel: artifactRiskLevel(artifact),
    score: null,
    reason: artifact.summary,
    createdAt: artifactTimestamp(artifact)
  };
}

export function createActionImagePlanView(
  artifact: StrategyActionArtifact,
  product?: ProcessedProduct,
  productAsset?: ProductAssetView
): ImagePlanViewItem {
  const done = artifact.status === "done";
  const inferredImageType = defaultImageType(product);
  const sheetAssets = availableAssets(product);
  const availableAssetsList = productAsset?.availableAssets?.length ? productAsset.availableAssets : sheetAssets;
  const imageType = done ? inferredImageType : "";
  return {
    id: artifact.artifactId,
    theme: artifact.title,
    contentType: artifact.contentType || "knowledge",
    productSku: artifact.sku || "",
    productName: product?.title_th || artifact.sku || "Creative Queue",
    platform: artifact.platform || "Facebook",
    imageType,
    imageConcept: done
      ? `ทำภาพสำหรับ ${artifact.title} โดยยึดตาม asset จริงของสินค้า`
      : "",
    imageText: done ? artifact.title.replace(/^Content Brief:\s*/i, "") : "",
    imagePrompt: imageType === "ai_image"
      ? "Clean product-inspired lifestyle scene, no logos, no fake branded product details"
      : "",
    imageNote: done
      ? "Action ถูกทำเสร็จและพร้อมแตกเป็น image brief"
      : "รอ content brief พร้อมก่อนสร้าง image brief",
    imageStatus: done ? "image_brief_ready" : "",
    generatedImageUrl: "",
    generatedImageFile: "",
    generatedImageProvider: "",
    generatedImageModel: "",
    generatedImagePrompt: "",
    generatedImageAt: "",
    imageApprovalStatus: "",
    availableAssets: availableAssetsList,
    assetNote: productAsset?.assetNote || product?.asset_note || "",
    assetSource: productAsset?.source || (sheetAssets.length ? "sheet" : "fallback"),
    driveFolderId: productAsset?.driveFolderId,
    driveFolderUrl: productAsset?.driveFolderUrl,
    driveAssetCount: productAsset?.assetCount,
    driveFiles: productAsset?.files,
    brandedProduct: /figure|collectible|blind_box|licensed|character/i.test(`${product?.category ?? ""} ${product?.product_type ?? ""}`),
    canMakeUnboxing: product?.can_make_unboxing ?? false,
    status: done ? "manager_final_check" : "content_passed",
    riskLevel: artifactRiskLevel(artifact),
    updatedAt: artifactTimestamp(artifact)
  };
}
