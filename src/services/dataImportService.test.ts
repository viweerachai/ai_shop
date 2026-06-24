import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { salesSourceLabel } from "./dataImportService.js";
import { ImportMetadataStore } from "../runtime/importMetadataStore.js";

describe("data import metadata", () => {
  it("falls back to default sales source label", () => {
    const store = new ImportMetadataStore(join(mkdtempSync(join(tmpdir(), "ai-shop-import-")), "import.json"));
    expect(typeof salesSourceLabel(store)).toBe("string");
  });

  it("returns imported sales source label when present", () => {
    const store = new ImportMetadataStore(join(mkdtempSync(join(tmpdir(), "ai-shop-import-")), "import.json"));
    store.set({
      kind: "sales_orders",
      sourceLabel: "sales_orders csv: latest.csv",
      importedAt: "2026-06-17T00:00:00.000Z",
      rowCount: 3
    });
    expect(salesSourceLabel(store)).toBe("sales_orders csv: latest.csv");
  });
});
