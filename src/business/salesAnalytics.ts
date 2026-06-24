import { SalesOrder } from "../types/salesOrder.js";

export interface ProductSalesSummary {
  sku: string;
  productName: string;
  units7d: number;
  units30d: number;
  revenue7d: number;
  revenue30d: number;
  orders7d: number;
  orders30d: number;
  lastOrderedAt: string;
  channels: string[];
}

export interface SalesAnalyticsSnapshot {
  sourceLabel: string;
  totalOrders7d: number;
  totalOrders30d: number;
  totalUnits7d: number;
  totalUnits30d: number;
  totalRevenue7d: number;
  totalRevenue30d: number;
  topProducts: ProductSalesSummary[];
  bySku: Map<string, ProductSalesSummary>;
}

function activeOrder(order: SalesOrder): boolean {
  const status = order.order_status.trim().toLowerCase();
  return !["cancelled", "canceled", "refund", "refunded", "void"].includes(status);
}

function normalizeDate(value: string): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function createSalesAnalytics(
  orders: SalesOrder[],
  options?: {
    now?: Date;
    sourceLabel?: string;
  }
): SalesAnalyticsSnapshot {
  const now = options?.now ?? new Date();
  const nowTs = now.getTime();
  const sevenDaysAgo = nowTs - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = nowTs - 30 * 24 * 60 * 60 * 1000;
  const bySku = new Map<string, ProductSalesSummary>();
  const orderIds7d = new Set<string>();
  const orderIds30d = new Set<string>();
  let totalUnits7d = 0;
  let totalUnits30d = 0;
  let totalRevenue7d = 0;
  let totalRevenue30d = 0;

  for (const order of orders.filter(activeOrder)) {
    const orderedAt = normalizeDate(order.ordered_at);
    if (orderedAt === null || orderedAt < thirtyDaysAgo) continue;

    const sku = order.sku.trim();
    if (!sku) continue;

    const summary = bySku.get(sku) ?? {
      sku,
      productName: order.product_name || sku,
      units7d: 0,
      units30d: 0,
      revenue7d: 0,
      revenue30d: 0,
      orders7d: 0,
      orders30d: 0,
      lastOrderedAt: "",
      channels: []
    };

    summary.units30d += order.quantity;
    summary.revenue30d += order.net_sales;
    if (!summary.lastOrderedAt || orderedAt > new Date(summary.lastOrderedAt).getTime()) {
      summary.lastOrderedAt = order.ordered_at;
    }
    if (order.channel && !summary.channels.includes(order.channel)) {
      summary.channels.push(order.channel);
    }
    totalUnits30d += order.quantity;
    totalRevenue30d += order.net_sales;
    orderIds30d.add(order.order_id);

    if (orderedAt >= sevenDaysAgo) {
      summary.units7d += order.quantity;
      summary.revenue7d += order.net_sales;
      totalUnits7d += order.quantity;
      totalRevenue7d += order.net_sales;
      orderIds7d.add(order.order_id);
    }

    bySku.set(sku, summary);
  }

  for (const summary of bySku.values()) {
    const matching30 = orders.filter((order) =>
      activeOrder(order) &&
      order.sku.trim() === summary.sku &&
      (normalizeDate(order.ordered_at) ?? 0) >= thirtyDaysAgo
    );
    const matching7 = matching30.filter((order) => (normalizeDate(order.ordered_at) ?? 0) >= sevenDaysAgo);
    summary.orders30d = new Set(matching30.map((order) => order.order_id)).size;
    summary.orders7d = new Set(matching7.map((order) => order.order_id)).size;
  }

  const topProducts = [...bySku.values()]
    .sort((a, b) =>
      b.units30d - a.units30d ||
      b.revenue30d - a.revenue30d ||
      b.orders30d - a.orders30d ||
      a.sku.localeCompare(b.sku)
    )
    .slice(0, 8);

  return {
    sourceLabel: options?.sourceLabel ?? "sales_orders",
    totalOrders7d: orderIds7d.size,
    totalOrders30d: orderIds30d.size,
    totalUnits7d,
    totalUnits30d,
    totalRevenue7d,
    totalRevenue30d,
    topProducts,
    bySku
  };
}

export function salesSummaryForSku(
  snapshot: SalesAnalyticsSnapshot,
  sku: string
): ProductSalesSummary | undefined {
  return snapshot.bySku.get(sku);
}
