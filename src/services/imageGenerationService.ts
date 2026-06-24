import { mkdir, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { config, requireGeminiApiKey } from "../config.js";
import { createRepos } from "../sheets/repos.js";
import { ContentPlan } from "../types/content.js";
import { ProcessedProduct } from "../types/product.js";
import { nowIso } from "../utils/date.js";

export const GENERATED_IMAGE_DIR = resolve(process.cwd(), "storage", "generated-images");

type GeminiImageBlock = {
  type?: string;
  data?: string;
  mime_type?: string;
  mimeType?: string;
};

type GeminiInteractionResponse = {
  id?: string;
  output_image?: GeminiImageBlock;
  outputImage?: GeminiImageBlock;
  steps?: Array<{
    type?: string;
    content?: GeminiImageBlock[];
    summary?: GeminiImageBlock[];
  }>;
};

function safeFilePart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "image";
}

function extensionFromMime(mimeType: string): "png" | "jpg" | "webp" {
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  if (mimeType.includes("webp")) return "webp";
  return "png";
}

function requestedMimeType(): "image/png" | "image/jpeg" | "image/webp" {
  if (config.imageAiOutputFormat === "jpeg") return "image/jpeg";
  if (config.imageAiOutputFormat === "webp") return "image/webp";
  return "image/png";
}

function isBrandedOrProductSensitive(product?: ProcessedProduct): boolean {
  if (!product) return false;
  const text = `${product.category} ${product.product_type} ${product.title_th}`.toLowerCase();
  return /pokemon|one piece|sonny|monchhichi|figure|collectible|licensed|brand|card|trading/i.test(text);
}

function buildImagePrompt(plan: ContentPlan, product?: ProcessedProduct): string {
  const platform = plan.target_platform || "social media";
  const textDirection = plan.image_text || plan.theme;
  const baseBrief = [
    plan.image_concept,
    plan.idea,
    plan.image_note
  ].filter(Boolean).join("\n");
  const sensitiveProduct = isBrandedOrProductSensitive(product);
  const visualMood = sensitiveProduct
    ? "premium hobby-store backdrop, soft spotlight, subtle shelf lighting, collector display atmosphere"
    : "clean lifestyle retail backdrop, soft spotlight, modern composition, subtle gradient atmosphere";

  return [
    "Create only a clean social-media background/template board for a Thai collectible resale shop.",
    `Format target: ${platform}.`,
    `Content theme: ${plan.theme}.`,
    `Visual mood: ${visualMood}.`,
    textDirection ? `Intended message direction only: ${textDirection}. Do not render the text itself.` : "",
    baseBrief ? `Creative brief for mood only:\n${baseBrief}` : "",
    "Non-negotiable rules:",
    "- Do NOT show any product, box, toy, trading card, pack, booster, package, logo, label, mascot, or branded silhouette.",
    "- Do NOT draw a shelf with product boxes on it.",
    "- Do NOT generate any readable text, letters, Thai text, English text, numbers, captions, labels, or logos in the image.",
    "- Do NOT imitate packaging or merch from any real brand.",
    "- This image must be empty enough to place the real product photo later.",
    "- Leave one clear hero placement area in the center or lower-center and supporting negative space around it.",
    "- Use abstract shapes, lighting, gradients, stage, podium, paper texture, soft shadows, or generic retail display elements only.",
    "- No unboxing, no opened product, no fake promo badge, no fake price tag.",
    "Return a background/template draft only, never a finished ad and never the product itself."
  ].filter(Boolean).join("\n");
}

function findGeminiImage(payload: GeminiInteractionResponse): GeminiImageBlock | undefined {
  if (payload.output_image?.data) return payload.output_image;
  if (payload.outputImage?.data) return payload.outputImage;
  for (const step of payload.steps ?? []) {
    for (const block of [...(step.content ?? []), ...(step.summary ?? [])]) {
      if ((block.type === "image" || block.data) && block.data) return block;
    }
  }
  return undefined;
}

async function imageBufferFromGemini(prompt: string): Promise<{ buffer: Buffer; revisedPrompt: string; mimeType: string }> {
  const apiKey = requireGeminiApiKey();
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.geminiImageModel,
      input: [{ type: "text", text: prompt }],
      response_format: {
        type: "image",
        mime_type: requestedMimeType(),
        aspect_ratio: config.imageAiAspectRatio
      }
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || response.statusText || "Gemini image generation failed.";
    throw new Error(message);
  }

  const image = findGeminiImage(payload as GeminiInteractionResponse);
  if (image?.data) {
    return {
      buffer: Buffer.from(image.data, "base64"),
      revisedPrompt: prompt,
      mimeType: image.mime_type || image.mimeType || requestedMimeType()
    };
  }

  throw new Error("Gemini image response did not include image data.");
}

export async function generateImageForContent(contentId: string): Promise<{
  contentId: string;
  imageUrl: string;
  fileName: string;
  provider: string;
  model: string;
}> {
  if (!config.hasGoogleCredentials) {
    throw new Error("Google Sheets credentials are required.");
  }
  if (!config.hasGeminiImageCredentials) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  const repos = createRepos();
  await repos.client.ensureSheets();
  const [plans, products] = await Promise.all([
    repos.contentPlans.all(),
    repos.processedProducts.all()
  ]);
  const plan = plans.find((item) => item.content_id === contentId);
  if (!plan) throw new Error("Content plan not found.");
  if (!["image_brief_ready", "image_generated"].includes(plan.image_status)) {
    throw new Error("Image brief is not ready yet. Run Image Planner first.");
  }

  const product = products.find((item) => item.sku === plan.related_product_sku);
  const prompt = buildImagePrompt(plan, product);
  const { buffer, revisedPrompt, mimeType } = await imageBufferFromGemini(prompt);
  await mkdir(GENERATED_IMAGE_DIR, { recursive: true });

  const ext = extensionFromMime(mimeType);
  const fileName = `${safeFilePart(plan.content_id)}-${Date.now()}.${ext}`;
  const filePath = resolve(GENERATED_IMAGE_DIR, fileName);
  await writeFile(filePath, buffer);

  const imageUrl = `/api/generated-images/${basename(fileName)}`;
  const now = nowIso();
  await repos.contentPlans.upsert([{
    ...plan,
    generated_image_url: imageUrl,
    generated_image_file: fileName,
    generated_image_provider: "gemini",
    generated_image_model: config.geminiImageModel,
    generated_image_prompt: revisedPrompt,
    generated_image_at: now,
    image_approval_status: plan.image_approval_status || "pending",
    image_status: "image_generated",
    updated_at: now
  }]);

  return {
    contentId,
    imageUrl,
    fileName,
    provider: "gemini",
    model: config.geminiImageModel
  };
}

export async function generateReadyImages(limit = 3): Promise<{
  generated: number;
  results: Array<{ contentId: string; imageUrl: string; fileName: string; provider: string; model: string }>;
}> {
  const repos = createRepos();
  await repos.client.ensureSheets();
  const plans = await repos.contentPlans.where((plan) => plan.image_status === "image_brief_ready");
  const results = [];
  for (const plan of plans.slice(0, Math.max(1, limit))) {
    results.push(await generateImageForContent(plan.content_id));
  }
  return { generated: results.length, results };
}
