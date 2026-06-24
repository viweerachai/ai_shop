import { ProductSalesSummary } from "./salesAnalytics.js";

export type ProductSalesStatus =
  | "top_seller"
  | "restock_risk"
  | "one_off_sold_signal"
  | "steady"
  | "slow_mover"
  | "no_recent_sales";

export interface ProductSalesSignals {
  status: ProductSalesStatus;
  labels: string[];
  summary: string;
  recommendedAction: string;
}

function dedupe(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}

export function deriveProductSalesSignals(
  input: {
    stock: number | null;
    isNewArrival?: boolean;
  },
  sales?: Pick<ProductSalesSummary, "units7d" | "units30d" | "revenue30d" | "orders30d">
): ProductSalesSignals {
  const stock = input.stock ?? 0;
  const units7d = sales?.units7d ?? 0;
  const units30d = sales?.units30d ?? 0;

  if (stock > 0 && stock <= 2 && units30d > 0) {
    return {
      status: "one_off_sold_signal",
      labels: dedupe(["Low stock", "Sales signal"]),
      summary: `ขายแล้ว ${units30d} ชิ้นใน 30 วัน แต่ stock เหลือ ${stock} ชิ้น`,
      recommendedAction: "ใช้ยอดขายเป็นหลักฐานความน่าสนใจได้ แต่ดันแบบจำกัด ไม่ทำโปรแรง"
    };
  }

  if (units7d >= 3 && stock > 0 && stock <= 5) {
    return {
      status: "restock_risk",
      labels: dedupe(["Top seller", "Restock risk"]),
      summary: `ขาย ${units7d} ชิ้นใน 7 วันล่าสุด แต่ stock เหลือ ${stock} ชิ้น`,
      recommendedAction: "เร่งเช็ก stock และจำกัดการดันโปรก่อนของหมด"
    };
  }

  if (units30d >= 8 || units7d >= 4) {
    return {
      status: "top_seller",
      labels: dedupe(["Top seller", input.isNewArrival ? "New arrival hit" : ""]),
      summary: `ยอดขายเด่น ${units30d} ชิ้นใน 30 วันล่าสุด`,
      recommendedAction: "ใช้เป็น hero product ของคอนเทนต์และแคมเปญ"
    };
  }

  if (stock >= 10 && units30d <= 2) {
    return {
      status: "slow_mover",
      labels: dedupe(["Slow mover", "Stock pressure"]),
      summary: `stock ${stock} ชิ้น แต่ขายเพียง ${units30d} ชิ้นใน 30 วัน`,
      recommendedAction: "เหมาะกับโปร bundle, free gift หรือ content ช่วยกระตุ้น"
    };
  }

  if (stock > 0 && units30d === 0) {
    return {
      status: "no_recent_sales",
      labels: dedupe(["No recent sales", stock <= 2 ? "One-off stock" : ""]),
      summary: stock <= 2
        ? `ยังไม่มียอดขายล่าสุด แต่มี stock เพียง ${stock} ชิ้น`
        : `ยังไม่มียอดขายล่าสุด แม้มี stock ${stock} ชิ้น`,
      recommendedAction: stock <= 2
        ? "ถ้ารูปพร้อม ให้ทำ showcase เบา ๆ แบบชิ้นเดียว ไม่ต้องใช้ยอดขายเป็นตัวตัดสินหลัก"
        : "ต้องทดสอบ hook คอนเทนต์หรือโปรใหม่ก่อนดันแรง"
    };
  }

  return {
    status: "steady",
    labels: dedupe([
      units30d > 0 ? "Steady sales" : "",
      input.isNewArrival ? "New arrival" : ""
    ]),
    summary: units30d > 0
      ? `ขายสะสม ${units30d} ชิ้นใน 30 วัน และยังทรงตัว`
      : "ยอดขายยังไม่เด่นแต่ไม่มีแรงกดดันเร่งด่วน",
    recommendedAction: "รักษาความต่อเนื่องของคอนเทนต์และติดตามยอดรายสัปดาห์"
  };
}
