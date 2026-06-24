import { config } from "../config.js";
import { ImportMetadataStore, importMetadataStore } from "../runtime/importMetadataStore.js";
import { getSystemSettings } from "../runtime/systemSettings.js";
import { workflowNames, type WorkflowName } from "../runtime/workflowRunner.js";
import { nowIso } from "../utils/date.js";

function needsGemini(name: WorkflowName): boolean {
  return [
    "product:intake",
    "product:write",
    "product:qa",
    "marketing:campaign",
    "content:new-arrival",
    "content:plan",
    "content:write",
    "content:qa",
    "image:plan",
    "image:generate",
    "promo:suggest",
    "auto:once"
  ].includes(name);
}

function needsClaude(name: WorkflowName): boolean {
  return [
    "ceo:daily",
    "marketing:campaign",
    "content:new-arrival",
    "content:plan",
    "promo:suggest",
    "auto:once"
  ].includes(name);
}

export function createOpenApiSpec(baseUrl = "http://localhost:3100") {
  return {
    openapi: "3.1.0",
    info: {
      title: "AI Shop System API",
      version: "0.1.0",
      description: "Operational API for dashboard data, workflow execution, approvals, and data import."
    },
    servers: [{ url: baseUrl }],
    components: {
      securitySchemes: {
        AdminToken: {
          type: "apiKey",
          in: "header",
          name: "x-admin-token",
          description: "Required only when API_ADMIN_TOKEN is configured."
        }
      }
    },
    paths: {
      "/api/health": { get: { summary: "Health status" } },
      "/api/dashboard": { get: { summary: "Dashboard overview" } },
      "/api/products": { get: { summary: "Products and assets workspace" } },
      "/api/marketing": { get: { summary: "Marketing strategy workspace" } },
      "/api/content": { get: { summary: "Content and QA workspace" } },
      "/api/images": { get: { summary: "Image plans workspace" } },
      "/api/images/{id}/generate": { post: { summary: "Generate one AI image draft" } },
      "/api/generated-images/{filename}": { get: { summary: "Read generated image file" } },
      "/api/product-assets": { get: { summary: "Product asset folders and Drive index" } },
      "/api/promotions": { get: { summary: "Promotion suggestions and approval queue" } },
      "/api/reports": { get: { summary: "Daily report workspace" } },
      "/api/system/overview": { get: { summary: "Integration, import, and workflow readiness overview" } },
      "/api/docs/openapi.json": { get: { summary: "OpenAPI document" } },
      "/api/workflows/{name}/run": { post: { summary: "Run one workflow" } },
      "/api/settings": {
        get: { summary: "Read runtime settings" },
        put: { summary: "Update runtime settings" }
      },
      "/api/imports/sales": {
        post: {
          summary: "Import sales order CSV from local path",
          security: [{ AdminToken: [] }]
        }
      },
      "/api/imports/stock": {
        post: {
          summary: "Import stock CSV from local path",
          security: [{ AdminToken: [] }]
        }
      },
      "/api/imports/products/bigseller": {
        post: {
          summary: "Import BigSeller Merchant SKU Excel from local path",
          security: [{ AdminToken: [] }]
        }
      },
      "/api/imports/sales/json": {
        post: {
          summary: "Import sales orders from JSON rows",
          security: [{ AdminToken: [] }]
        }
      },
      "/api/imports/stock/json": {
        post: {
          summary: "Import stock updates from JSON rows",
          security: [{ AdminToken: [] }]
        }
      }
    }
  };
}

export function getSystemOverview(store: ImportMetadataStore = importMetadataStore) {
  const imports = store.latest();
  return {
    generatedAt: nowIso(),
    mode: config.hasGoogleCredentials ? "live" : "demo",
    integrations: {
      googleSheets: {
        configured: config.hasGoogleCredentials,
        detail: config.hasGoogleCredentials ? "พร้อมอ่านและเขียน Google Sheets" : "ยังไม่มี GOOGLE_* credentials"
      },
      gemini: {
        configured: config.hasGeminiCredentials,
        detail: config.hasGeminiCredentials ? `พร้อมใช้งาน ${config.geminiModel}` : "ยังไม่มี GEMINI_API_KEY"
      },
      claude: {
        configured: config.hasAnthropicCredentials,
        detail: config.hasAnthropicCredentials ? `พร้อมใช้งาน ${config.anthropicModel}` : "ยังไม่มี ANTHROPIC_API_KEY"
      },
      geminiImage: {
        configured: config.hasGeminiImageCredentials,
        detail: config.hasGeminiImageCredentials
          ? `พร้อมสร้างภาพด้วย ${config.geminiImageModel}`
          : "ยังไม่มี GEMINI_API_KEY"
      },
      adminToken: {
        configured: config.hasAdminToken,
        detail: config.hasAdminToken ? "เปิดใช้ x-admin-token สำหรับ import/admin endpoints" : "ยังไม่ได้ตั้ง API_ADMIN_TOKEN"
      }
    },
    imports: {
      productImports: imports.product_imports ?? null,
      salesOrders: imports.sales_orders ?? null,
      stockUpdates: imports.stock_updates ?? null
    },
    settings: getSystemSettings(),
    workflowReadiness: workflowNames.map((name) => ({
      name,
      ready:
        config.hasGoogleCredentials &&
        (!needsGemini(name) || config.hasGeminiCredentials) &&
        (!needsClaude(name) || config.hasAnthropicCredentials),
      requires: {
        googleSheets: true,
        gemini: needsGemini(name),
        claude: needsClaude(name),
        geminiImage: name === "image:generate" || name === "auto:once"
      }
    })),
    docs: {
      openApiJson: "/api/docs/openapi.json"
    }
  };
}
