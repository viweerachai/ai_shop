import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ImportMetadataStore } from "../runtime/importMetadataStore.js";
import { createOpenApiSpec, getSystemOverview } from "./systemOverviewService.js";

describe("system overview service", () => {
  it("includes latest import metadata when present", () => {
    const store = new ImportMetadataStore(join(mkdtempSync(join(tmpdir(), "ai-shop-overview-")), "import.json"));
    store.set({
      kind: "sales_orders",
      sourceLabel: "sales_orders csv: june.csv",
      importedAt: "2026-06-17T04:00:00.000Z",
      rowCount: 44
    });

    const overview = getSystemOverview(store);
    expect(overview.imports.salesOrders?.sourceLabel).toBe("sales_orders csv: june.csv");
    expect(overview.workflowReadiness.some((workflow) => workflow.name === "ceo:daily")).toBe(true);
  });

  it("builds an openapi document for the main endpoints", () => {
    const spec = createOpenApiSpec();
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.paths["/api/system/overview"]).toBeDefined();
    expect(spec.paths["/api/imports/sales"].post.security).toEqual([{ AdminToken: [] }]);
    expect(spec.paths["/api/imports/sales/json"]).toBeDefined();
    expect(spec.paths["/api/imports/stock/json"]).toBeDefined();
  });
});
