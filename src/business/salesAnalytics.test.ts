import { describe, expect, it } from "vitest";
import { createSalesAnalytics, salesSummaryForSku } from "./salesAnalytics.js";
import { SalesOrder } from "../types/salesOrder.js";

const orders: SalesOrder[] = [
  {
    order_id: "o-1",
    ordered_at: "2026-06-15T10:00:00.000Z",
    sku: "SKU-1",
    product_name: "Top Seller",
    quantity: 2,
    net_sales: 2000,
    channel: "Shopee",
    order_status: "paid",
    note: ""
  },
  {
    order_id: "o-2",
    ordered_at: "2026-06-12T10:00:00.000Z",
    sku: "SKU-1",
    product_name: "Top Seller",
    quantity: 3,
    net_sales: 3000,
    channel: "TikTok",
    order_status: "completed",
    note: ""
  },
  {
    order_id: "o-3",
    ordered_at: "2026-05-25T10:00:00.000Z",
    sku: "SKU-2",
    product_name: "Older Seller",
    quantity: 1,
    net_sales: 500,
    channel: "Line",
    order_status: "paid",
    note: ""
  },
  {
    order_id: "o-4",
    ordered_at: "2026-06-16T10:00:00.000Z",
    sku: "SKU-3",
    product_name: "Cancelled Item",
    quantity: 5,
    net_sales: 5000,
    channel: "Shopee",
    order_status: "cancelled",
    note: ""
  }
];

describe("sales analytics", () => {
  it("aggregates valid orders into 7d and 30d signals", () => {
    const snapshot = createSalesAnalytics(orders, {
      now: new Date("2026-06-17T00:00:00.000Z"),
      sourceLabel: "sales_orders"
    });

    expect(snapshot.totalOrders30d).toBe(3);
    expect(snapshot.totalUnits7d).toBe(5);
    expect(snapshot.totalRevenue30d).toBe(5500);
    expect(snapshot.topProducts[0]?.sku).toBe("SKU-1");

    const sku1 = salesSummaryForSku(snapshot, "SKU-1");
    expect(sku1?.units7d).toBe(5);
    expect(sku1?.orders30d).toBe(2);
    expect(sku1?.channels).toEqual(expect.arrayContaining(["Shopee", "TikTok"]));
  });
});
