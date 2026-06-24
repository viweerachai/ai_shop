import { FastifyInstance } from "fastify";
import { createReadStream, existsSync } from "node:fs";
import { basename, resolve } from "node:path";
import { z } from "zod";
import { config } from "../config.js";
import { getSystemSettings, updateSystemSettings } from "../runtime/systemSettings.js";
import { runNamedWorkflow, workflowNames } from "../runtime/workflowRunner.js";
import { workflowRunStore } from "../runtime/workflowRunStore.js";
import { createRepos } from "../sheets/repos.js";
import { getDashboardData } from "../services/dashboardService.js";
import { getProducts } from "../services/productService.js";
import { enforceAssetRules } from "../business/productRules.js";
import { nowIso } from "../utils/date.js";
import { getMarketingView } from "../services/marketingService.js";
import { getContentView } from "../services/contentService.js";
import { getSystemSettings as readSystemSettings } from "../runtime/systemSettings.js";
import { loadProductAssetViews } from "../services/productAssetService.js";
import { getImagePlans } from "../services/imagePlanService.js";
import { GENERATED_IMAGE_DIR, generateImageForContent } from "../services/imageGenerationService.js";
import { getPromotions } from "../services/promotionService.js";
import { canApprovePromotion } from "../business/promotionRules.js";
import { getReportView } from "../services/reportService.js";
import { strategyActionStore } from "../runtime/strategyActionStore.js";
import { findStrategyActionById } from "../services/strategyActionService.js";
import { syncActionToSheets } from "../services/strategyActionSheetSync.js";
import { addCeoChatAction, askCeo, saveCeoRule } from "../services/ceoConversationService.js";
import { assertWorkflowDependencies } from "../runtime/workflowRunner.js";
import {
  importBigSellerSkuExcel,
  importSalesOrdersCsv,
  importSalesOrdersJson,
  importStockCsv,
  importStockJson
} from "../services/dataImportService.js";
import { createOpenApiSpec, getSystemOverview } from "../services/systemOverviewService.js";
import { agentLogStore } from "../runtime/agentLogStore.js";

const workflowSchema = z.enum(workflowNames);
const settingsSchema = z.object({
  autoMode: z.enum(["semi_auto", "trusted_auto", "full_auto"]).optional(),
  autoPublish: z.boolean().optional(),
  minScore: z.number().min(0).max(100).optional(),
  maxRisk: z.enum(["low", "medium", "high"]).optional()
});
const assetUpdateSchema = z.object({
  availableAssets: z.array(z.string().trim().min(1)).max(20),
  assetNote: z.string().max(1000),
  canMakeUnboxing: z.boolean(),
  canMakeReview: z.boolean(),
  canMakeProductShowcase: z.boolean()
});
const rewriteSchema = z.object({
  instruction: z.string().trim().min(1).max(1000).optional()
});
const promotionDecisionSchema = z.object({
  note: z.string().trim().max(1000).optional()
});
const strategyActionDecisionSchema = z.object({
  status: z.enum(["ready", "in_progress", "completed", "watch", "blocked"])
});
const ceoChatSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  addToQueue: z.boolean().optional()
});
const ceoChatActionSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1).max(240),
  owner: z.enum(["CEO", "Marketing", "Manager", "Owner"]),
  priority: z.enum(["high", "medium", "low"]),
  status: z.enum(["ready", "in_progress", "completed", "watch", "blocked"]),
  reason: z.string().trim().min(1).max(1000),
  source: z.enum(["sales", "content", "promotion", "operations"]),
  sku: z.string().trim().max(120).optional()
});
const ceoRuleSchema = z.object({
  content: z.string().trim().min(1).max(2000)
});
const importRequestSchema = z.object({
  filePath: z.string().trim().min(1)
});
const salesImportJsonSchema = z.object({
  sourceLabel: z.string().trim().max(200).optional(),
  rows: z.array(z.object({
    order_id: z.string().trim().min(1),
    ordered_at: z.string().optional(),
    sku: z.string().optional(),
    product_name: z.string().optional(),
    quantity: z.union([z.number(), z.string()]).optional(),
    net_sales: z.union([z.number(), z.string()]).optional(),
    channel: z.string().optional(),
    order_status: z.string().optional(),
    note: z.string().optional()
  })).min(1)
});
const stockImportJsonSchema = z.object({
  sourceLabel: z.string().trim().max(200).optional(),
  rows: z.array(z.object({
    sku: z.string().trim().min(1),
    stock: z.union([z.number(), z.string(), z.null()]).optional(),
    cost_price: z.union([z.number(), z.string(), z.null()]).optional(),
    selling_price: z.union([z.number(), z.string(), z.null()]).optional()
  })).min(1)
});

function adminAllowed(request: { headers: Record<string, unknown> }): boolean {
  if (!config.apiAdminToken) return true;
  return request.headers["x-admin-token"] === config.apiAdminToken;
}

export async function registerApiRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/health", async () => ({
    ok: true,
    mode: config.hasGoogleCredentials ? "live" : "demo",
    geminiConfigured: config.hasGeminiCredentials,
    geminiImageConfigured: config.hasGeminiImageCredentials,
    claudeConfigured: config.hasAnthropicCredentials,
    adminTokenConfigured: config.hasAdminToken,
    timestamp: nowIso()
  }));

  app.get("/api/dashboard", async () => getDashboardData());
  app.get("/api/products", async () => getProducts());
  app.get("/api/marketing", async () => getMarketingView());
  app.get("/api/content", async () => getContentView());
  app.get("/api/images", async () => getImagePlans());
  app.get<{ Params: { filename: string } }>("/api/generated-images/:filename", async (request, reply) => {
    const filename = basename(request.params.filename);
    const filePath = resolve(GENERATED_IMAGE_DIR, filename);
    if (!filePath.startsWith(GENERATED_IMAGE_DIR) || !existsSync(filePath)) {
      return reply.code(404).send({ error: "Generated image not found." });
    }
    const ext = filename.split(".").pop()?.toLowerCase();
    const contentType =
      ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
        ext === "webp" ? "image/webp" :
          "image/png";
    reply.header("Content-Type", contentType);
    reply.header("Cache-Control", "private, max-age=300");
    return reply.send(createReadStream(filePath));
  });
  app.get("/api/product-assets", async () => ({ mode: config.hasGoogleCredentials ? "live" : "demo", assets: await loadProductAssetViews() }));
  app.get<{ Params: { id: string } }>("/api/drive/files/:id/image", async (request, reply) => {
    if (!config.hasGoogleCredentials) {
      return reply.code(409).send({ error: "Google Drive credentials are required." });
    }
    try {
      const { metadata, stream } = await createRepos().client.getDriveFileMedia(request.params.id);
      const mimeType = metadata.mimeType || "";
      if (!mimeType.startsWith("image/")) {
        return reply.code(415).send({ error: "Drive file is not an image." });
      }
      reply.header("Content-Type", mimeType);
      reply.header("Cache-Control", "private, max-age=300");
      if (metadata.size) reply.header("Content-Length", metadata.size);
      return reply.send(stream);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Drive image failed.";
      const status = /not\s*found|file not found/i.test(message) ? 404 : 500;
      return reply.code(status).send({ error: message });
    }
  });
  app.get("/api/promotions", async () => getPromotions());
  app.get("/api/reports", async () => getReportView());
  app.get("/api/workflows/runs", async () => ({ runs: workflowRunStore.list() }));
  app.get("/api/settings", async () => getSystemSettings());
  app.get("/api/strategy-actions", async () => strategyActionStore.snapshot());
  app.get("/api/system/overview", async () => getSystemOverview());
  app.get("/api/docs/openapi.json", async () => createOpenApiSpec());

  app.post<{ Params: { id: string } }>("/api/images/:id/generate", async (request, reply) => {
    if (!adminAllowed(request)) return reply.code(401).send({ error: "Invalid x-admin-token." });
    try {
      return { ok: true, result: await generateImageForContent(request.params.id) };
    } catch (error) {
      return reply.code(500).send({
        error: error instanceof Error ? error.message : "Image generation failed."
      });
    }
  });

  app.post("/api/ceo/chat", async (request, reply) => {
    if (!adminAllowed(request)) return reply.code(401).send({ error: "Invalid x-admin-token." });
    const parsed = ceoChatSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    try {
      return await askCeo(parsed.data.message, { addToQueue: parsed.data.addToQueue });
    } catch (error) {
      return reply.code(500).send({
        error: error instanceof Error ? error.message : "AI CEO chat failed."
      });
    }
  });

  app.post("/api/ceo/chat/actions", async (request, reply) => {
    if (!adminAllowed(request)) return reply.code(401).send({ error: "Invalid x-admin-token." });
    const parsed = ceoChatActionSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    return { ok: true, action: await addCeoChatAction(parsed.data) };
  });

  app.post("/api/ceo/chat/rules", async (request, reply) => {
    if (!adminAllowed(request)) return reply.code(401).send({ error: "Invalid x-admin-token." });
    const parsed = ceoRuleSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    try {
      return { ok: true, rule: await saveCeoRule(parsed.data.content) };
    } catch (error) {
      return reply.code(500).send({
        error: error instanceof Error ? error.message : "Saving CEO rule failed."
      });
    }
  });

  app.get<{ Querystring: { promptName?: string; status?: string; limit?: string } }>(
    "/api/agent-logs",
    async (request) => {
      const { promptName, status, limit } = request.query;
      const filterStatus = status === "success" || status === "failed" ? status : undefined;
      const parsedLimit = limit ? Math.min(Math.max(Number(limit) || 50, 1), 200) : 50;
      return {
        total: agentLogStore.count(),
        entries: agentLogStore.list({
          promptName: promptName?.trim() || undefined,
          status: filterStatus,
          limit: parsedLimit
        }).map((entry) => ({
          logId: entry.logId,
          promptName: entry.promptName,
          status: entry.status,
          startedAt: entry.startedAt,
          finishedAt: entry.finishedAt,
          durationMs: entry.durationMs,
          inputPreview: entry.inputPreview,
          promptPreview: entry.promptPreview,
          responsePreview: entry.responsePreview,
          error: entry.error
        }))
      };
    }
  );

  app.get<{ Params: { id: string } }>("/api/agent-logs/:id", async (request, reply) => {
    const entry = agentLogStore.find(request.params.id);
    if (!entry) return reply.code(404).send({ error: "Log entry not found" });
    return entry;
  });

  app.post("/api/imports/sales", async (request, reply) => {
    if (!adminAllowed(request)) return reply.code(401).send({ error: "Invalid x-admin-token." });
    if (!config.hasGoogleCredentials) return reply.code(409).send({ error: "Google Sheets credentials are required." });
    const parsed = importRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    return importSalesOrdersCsv(parsed.data.filePath);
  });

  app.post("/api/imports/stock", async (request, reply) => {
    if (!adminAllowed(request)) return reply.code(401).send({ error: "Invalid x-admin-token." });
    if (!config.hasGoogleCredentials) return reply.code(409).send({ error: "Google Sheets credentials are required." });
    const parsed = importRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    return importStockCsv(parsed.data.filePath);
  });

  app.post("/api/imports/products/bigseller", async (request, reply) => {
    if (!adminAllowed(request)) return reply.code(401).send({ error: "Invalid x-admin-token." });
    if (!config.hasGoogleCredentials) return reply.code(409).send({ error: "Google Sheets credentials are required." });
    const parsed = importRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    return importBigSellerSkuExcel(parsed.data.filePath);
  });

  app.post("/api/imports/sales/json", async (request, reply) => {
    if (!adminAllowed(request)) return reply.code(401).send({ error: "Invalid x-admin-token." });
    if (!config.hasGoogleCredentials) return reply.code(409).send({ error: "Google Sheets credentials are required." });
    const parsed = salesImportJsonSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    return importSalesOrdersJson(parsed.data.rows, parsed.data.sourceLabel || "sales_orders api");
  });

  app.post("/api/imports/stock/json", async (request, reply) => {
    if (!adminAllowed(request)) return reply.code(401).send({ error: "Invalid x-admin-token." });
    if (!config.hasGoogleCredentials) return reply.code(409).send({ error: "Google Sheets credentials are required." });
    const parsed = stockImportJsonSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    return importStockJson(parsed.data.rows, parsed.data.sourceLabel || "stock api");
  });

  app.post<{ Params: { id: string } }>("/api/strategy-actions/:id/reset", async (request, reply) => {
    if (!adminAllowed(request)) return reply.code(401).send({ error: "Invalid x-admin-token." });
    const action = await findStrategyActionById(request.params.id);
    if (!action) return reply.code(404).send({ error: "Action not found" });
    const result = strategyActionStore.reset(action);
    if (config.hasGoogleCredentials) {
      await syncActionToSheets(action.id);
    }
    return { ok: true, ...result };
  });

  app.post<{ Params: { id: string } }>("/api/strategy-actions/:id/status", async (request, reply) => {
    if (!adminAllowed(request)) return reply.code(401).send({ error: "Invalid x-admin-token." });
    const parsed = strategyActionDecisionSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const action = await findStrategyActionById(request.params.id);
    if (!action) return reply.code(404).send({ error: "Action not found" });
    const result = strategyActionStore.update(action, parsed.data.status);
    if (config.hasGoogleCredentials) {
      await syncActionToSheets(action.id);
    }
    return { ok: true, ...result };
  });

  app.put("/api/settings", async (request, reply) => {
    if (!adminAllowed(request)) return reply.code(401).send({ error: "Invalid x-admin-token." });
    const parsed = settingsSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    return updateSystemSettings(parsed.data);
  });

  app.post<{ Params: { name: string } }>("/api/workflows/:name/run", async (request, reply) => {
    if (!adminAllowed(request)) return reply.code(401).send({ error: "Invalid x-admin-token." });
    const parsed = workflowSchema.safeParse(request.params.name);
    if (!parsed.success) return reply.code(404).send({ error: "Unknown workflow" });
    try {
      assertWorkflowDependencies(parsed.data);
    } catch (error) {
      return reply.code(409).send({
        error: error instanceof Error ? error.message : "Workflow dependencies are missing."
      });
    }
    const hasRunningAuto = workflowRunStore.hasRunning("auto:once");
    const isBusy = parsed.data === "auto:once"
      ? workflowRunStore.hasRunning()
      : hasRunningAuto || workflowRunStore.hasRunning(parsed.data);
    if (isBusy) {
      return reply.code(409).send({
        error: "Workflow is already running. Please wait for the current run to finish."
      });
    }
    try {
      return await runNamedWorkflow(parsed.data);
    } catch (error) {
      return reply.code(500).send({
        error: error instanceof Error ? error.message : "Workflow failed."
      });
    }
  });

  app.post<{ Params: { id: string } }>("/api/content/:id/approve", async (request, reply) => {
    if (!adminAllowed(request)) return reply.code(401).send({ error: "Invalid x-admin-token." });
    if (!config.hasGoogleCredentials) return reply.code(409).send({ error: "Demo mode is read-only." });
    const repos = createRepos();
    const item = (await repos.contentPlans.all()).find((content) => content.content_id === request.params.id);
    if (!item) return reply.code(404).send({ error: "Content not found" });
    const settings = readSystemSettings();
    if (
      item.status !== "owner_review_required" ||
      item.qa_status !== "passed" ||
      item.qa_score < settings.minScore
    ) {
      return reply.code(409).send({
        error: "Only owner-review content that passed QA can be approved."
      });
    }
    await repos.contentPlans.upsert([{
      ...item,
      status: "ready_to_post",
      owner_status: "approved",
      updated_at: nowIso()
    }]);
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>("/api/content/:id/rewrite", async (request, reply) => {
    if (!adminAllowed(request)) return reply.code(401).send({ error: "Invalid x-admin-token." });
    if (!config.hasGoogleCredentials) return reply.code(409).send({ error: "Demo mode is read-only." });
    const parsed = rewriteSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const repos = createRepos();
    const item = (await repos.contentPlans.all()).find((content) => content.content_id === request.params.id);
    if (!item) return reply.code(404).send({ error: "Content not found" });
    await repos.contentPlans.upsert([{
      ...item,
      status: "needs_rewrite",
      owner_status: "rewrite_requested",
      rewrite_instruction: parsed.data.instruction || item.rewrite_instruction || "แก้ไขตามผล QA และกฎร้าน",
      updated_at: nowIso()
    }]);
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>("/api/promotions/:id/approve", async (request, reply) => {
    if (!adminAllowed(request)) return reply.code(401).send({ error: "Invalid x-admin-token." });
    if (!config.hasGoogleCredentials) return reply.code(409).send({ error: "Demo mode is read-only." });
    const repos = createRepos();
    const item = (await repos.promotionPlans.all()).find((promotion) => promotion.promo_id === request.params.id);
    if (!item) return reply.code(404).send({ error: "Promotion not found" });
    const product = (await repos.processedProducts.all()).find(
      (candidate) => candidate.sku === item.related_product_sku
    );
    const decision = canApprovePromotion(item, product);
    if (!decision.allowed) return reply.code(409).send({ error: decision.reason });
    await repos.promotionPlans.upsert([{
      ...item,
      status: "approved",
      approved_at: nowIso()
    }]);
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>("/api/promotions/:id/reject", async (request, reply) => {
    if (!adminAllowed(request)) return reply.code(401).send({ error: "Invalid x-admin-token." });
    if (!config.hasGoogleCredentials) return reply.code(409).send({ error: "Demo mode is read-only." });
    const parsed = promotionDecisionSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const repos = createRepos();
    const item = (await repos.promotionPlans.all()).find((promotion) => promotion.promo_id === request.params.id);
    if (!item) return reply.code(404).send({ error: "Promotion not found" });
    if (item.status !== "suggested" && item.status !== "hold") {
      return reply.code(409).send({ error: "Only suggested or held promotions can be rejected." });
    }
    await repos.promotionPlans.upsert([{
      ...item,
      status: "rejected",
      manager_note: parsed.data.note || item.manager_note,
      approved_at: ""
    }]);
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>("/api/promotions/:id/hold", async (request, reply) => {
    if (!adminAllowed(request)) return reply.code(401).send({ error: "Invalid x-admin-token." });
    if (!config.hasGoogleCredentials) return reply.code(409).send({ error: "Demo mode is read-only." });
    const parsed = promotionDecisionSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const repos = createRepos();
    const item = (await repos.promotionPlans.all()).find((promotion) => promotion.promo_id === request.params.id);
    if (!item) return reply.code(404).send({ error: "Promotion not found" });
    if (item.status !== "suggested") {
      return reply.code(409).send({ error: "Only suggested promotions can be held." });
    }
    await repos.promotionPlans.upsert([{
      ...item,
      status: "hold",
      manager_note: parsed.data.note || item.manager_note
    }]);
    return { ok: true };
  });

  app.patch<{ Params: { id: string } }>("/api/products/:id/assets", async (request, reply) => {
    if (!adminAllowed(request)) return reply.code(401).send({ error: "Invalid x-admin-token." });
    if (!config.hasGoogleCredentials) return reply.code(409).send({ error: "Demo mode is read-only." });
    const parsed = assetUpdateSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const repos = createRepos();
    const item = (await repos.processedProducts.all()).find(
      (product) => product.product_id === request.params.id
    );
    if (!item) return reply.code(404).send({ error: "Processed product not found" });
    const enforced = enforceAssetRules({
      available_assets: parsed.data.availableAssets,
      can_make_unboxing: parsed.data.canMakeUnboxing,
      can_make_review: parsed.data.canMakeReview
    });
    await repos.processedProducts.upsert([{
      ...item,
      available_assets: enforced.available_assets.join(", "),
      asset_note: parsed.data.assetNote,
      can_make_unboxing: enforced.can_make_unboxing,
      can_make_review: enforced.can_make_review,
      can_make_product_showcase: parsed.data.canMakeProductShowcase,
      updated_at: nowIso()
    }]);
    return { ok: true, enforced };
  });
}
