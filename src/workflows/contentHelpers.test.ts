import { describe, expect, it } from "vitest";
import { prioritySort, toContentRow } from "./contentHelpers.js";

describe("content helpers", () => {
  it("prioritizes CEO and marketing focus SKUs ahead of generic ready products", () => {
    const sorted = prioritySort([
      {
        sku: "SKU-LOW",
        is_new_arrival: false,
        launch_post_done: false,
        publish_priority: 80,
        content_used_count: 1,
        last_content_date: "2026-06-16"
      },
      {
        sku: "SKU-CEO",
        is_new_arrival: false,
        launch_post_done: false,
        publish_priority: 10,
        content_used_count: 5,
        last_content_date: "2026-06-16"
      },
      {
        sku: "SKU-MKT",
        is_new_arrival: false,
        launch_post_done: false,
        publish_priority: 20,
        content_used_count: 4,
        last_content_date: "2026-06-16"
      }
    ], {
      ceoPrioritySkus: ["SKU-CEO"],
      marketingFocusSkus: ["SKU-MKT"],
      getSku: (product) => product.sku
    });

    expect(sorted.map((item) => item.sku)).toEqual(["SKU-CEO", "SKU-MKT", "SKU-LOW"]);
  });

  it("carries planning notes into content rows", () => {
    const row = toContentRow({
      content_type: "new_arrival",
      theme: "สินค้าเข้าใหม่",
      related_product_sku: "SKU-1",
      target_platform: "Facebook",
      idea: "เปิดตัวสินค้า",
      publish_date: "2026-06-17"
    }, {
      writerNote: "CEO priority product",
      riskNote: "Guardrail: blind box wording"
    });

    expect(row.writer_note).toBe("CEO priority product");
    expect(row.risk_note).toBe("Guardrail: blind box wording");
  });
});
