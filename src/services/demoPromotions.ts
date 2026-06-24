import { PromotionResponse, PromotionViewItem } from "../types/promotionView.js";
import { ApprovalViewItem } from "../types/promotionView.js";
import { strategyActionStore } from "../runtime/strategyActionStore.js";
import {
  createActionApprovalView,
  createActionPromotionView,
  visibleActionArtifacts
} from "./strategyArtifacts.js";

const now = new Date().toISOString();

export function getDemoPromotions(): PromotionResponse {
  const promotions: PromotionViewItem[] = [
    {
      id: "promo-demo-1", type: "bundle", productSku: "OP-CHOPPER-01",
      productName: "One Piece Figure - Tony Tony Chopper", bundleSku: "OP-LUFFY-01",
      discountType: "", discountValue: "", startDate: "2026-06-20", endDate: "2026-06-22",
      reason: "สินค้ากลุ่ม One Piece มีความเกี่ยวข้องและสามารถเพิ่มยอดต่อบิล",
      expectedGoal: "เพิ่มมูลค่าต่อคำสั่งซื้อ", riskNote: "",
      managerNote: "รอเจ้าของร้านยืนยันสินค้าที่เข้าชุด", status: "suggested" as const,
      createdBy: "AI Sales Analyst", createdAt: now, approvedAt: "",
      hasMarginData: true, stock: 7, stockLabel: "พร้อมขาย (7)", marginPercent: 46, riskLevel: "low",
      routeLabel: "Bundle pair", approvalReadiness: "needs_review",
      strategyLabels: ["Campaign focus", "Top seller", "Margin ready"],
      decisionSummary: "AI เลือกสินค้านี้ตามแคมเปญ New Arrival Collector Week • สต็อก 7 ชิ้น ยังรองรับการทำโปรได้ • ยอดขายเด่น 11 ชิ้นใน 30 วันล่าสุด",
      watchouts: ["รอเจ้าของร้านยืนยันสินค้าที่เข้าชุด"],
      approvalBlockedReason: ""
    },
    {
      id: "promo-demo-2", type: "freegift", productSku: "MOLLY-SPACE-01",
      productName: "Molly Space Adventure", bundleSku: "", discountType: "",
      discountValue: "", startDate: "", endDate: "",
      reason: "ไม่มีข้อมูล margin จึงหลีกเลี่ยงส่วนลดตรง",
      expectedGoal: "ช่วยขยับสินค้าสต็อกช้า", riskNote: "ต้องกำหนดต้นทุนของแถม",
      managerNote: "เลือกของแถมมูลค่าต่ำและให้เจ้าของร้านอนุมัติ", status: "suggested" as const,
      createdBy: "AI Sales Analyst", createdAt: now, approvedAt: "",
      hasMarginData: false, stock: 15, stockLabel: "ดันได้ (15)", marginPercent: null, riskLevel: "medium",
      routeLabel: "Free gift", approvalReadiness: "needs_review",
      strategyLabels: ["Stock push", "Slow mover", "Margin missing"],
      decisionSummary: "AI เลือกสินค้านี้จากคะแนนความพร้อมของสินค้า • สต็อก 15 ชิ้น รองรับการเร่งยอดด้วยโปรได้ • stock สูงแต่ยอดขายยังช้า จึงเหมาะกับของแถมหรือ bundle มากกว่า",
      watchouts: ["ต้องกำหนดต้นทุนของแถม", "ยังไม่มีข้อมูลต้นทุนหรือ margin ครบถ้วน", "ยอดขายยังช้า เหมาะกับ bundle หรือของแถมมากกว่าส่วนลดตรง"],
      approvalBlockedReason: ""
    },
    {
      id: "promo-demo-3", type: "discount", productSku: "GHIBLI-TOTORO-01",
      productName: "Totoro Mini Figure Set", bundleSku: "", discountType: "percent",
      discountValue: "10", startDate: "2026-06-27", endDate: "2026-06-29",
      reason: "มีข้อมูลต้นทุนและ margin รองรับ", expectedGoal: "เพิ่ม conversion ช่วงปลายเดือน",
      riskNote: "", managerNote: "ส่วนลดไม่เกินกรอบ margin", status: "approved" as const,
      createdBy: "AI Sales Analyst", createdAt: now, approvedAt: now,
      hasMarginData: true, stock: 5, stockLabel: "ต่ำ (5)", marginPercent: 38, riskLevel: "medium",
      routeLabel: "Direct discount", approvalReadiness: "needs_review",
      strategyLabels: ["Top seller", "Restock risk", "Margin ready"],
      decisionSummary: "AI เลือกสินค้านี้จากคะแนนความพร้อมของสินค้า • ขาย 3 ชิ้นใน 7 วันล่าสุด แต่ stock เหลือ 5 ชิ้น • มี margin 38% รองรับการประเมินส่วนลด",
      watchouts: ["ส่วนลดไม่เกินกรอบ margin", "ขายดีแต่ stock เริ่มตึง อย่าดันโปรแรงเกินไป"],
      approvalBlockedReason: ""
    },
    {
      id: "promo-demo-4", type: "discount", productSku: "MOLLY-SPACE-01",
      productName: "Molly Space Adventure", bundleSku: "", discountType: "percent",
      discountValue: "20", startDate: "", endDate: "",
      reason: "ทดลองเร่งยอด", expectedGoal: "ลดสต็อก", riskNote: "ไม่มีข้อมูลต้นทุน",
      managerNote: "ควรเปลี่ยนเป็น bundle หรือ free gift", status: "hold" as const,
      createdBy: "AI Sales Analyst", createdAt: now, approvedAt: "",
      hasMarginData: false, stock: 15, stockLabel: "ดันได้ (15)", marginPercent: null, riskLevel: "high",
      routeLabel: "Direct discount", approvalReadiness: "blocked",
      strategyLabels: ["Stock push", "Margin missing"],
      decisionSummary: "AI เลือกสินค้านี้จากคะแนนความพร้อมของสินค้า • สต็อก 15 ชิ้น รองรับการเร่งยอดด้วยโปรได้ • ไม่มี cost หรือ margin data จึงไม่ควรใช้ส่วนลดตรง",
      watchouts: ["Direct discount requires cost and margin data.", "ไม่มีข้อมูลต้นทุน", "ยังไม่มีข้อมูลต้นทุนหรือ margin ครบถ้วน", "ควรเปลี่ยนเป็น bundle หรือ free gift"],
      approvalBlockedReason: "Direct discount requires cost and margin data."
    }
  ];
  const actionArtifacts = visibleActionArtifacts(strategyActionStore.snapshot().recentArtifacts);
  const actionPromotions = actionArtifacts
    .filter((artifact) => artifact.kind === "promotion_plan")
    .map((artifact) => createActionPromotionView(artifact));
  const mergedPromotions = [...actionPromotions, ...promotions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const approvals: ApprovalViewItem[] = [
    ...actionArtifacts
      .filter((artifact) => artifact.kind === "promotion_plan" && artifact.status !== "done")
      .map((artifact) => createActionApprovalView(artifact)),
    {
      id: "content-demo-4", kind: "content" as const, title: "One Piece Bundle Weekend",
      subtitle: "Promotion Content · OP-CHOPPER-01", status: "owner_review_required",
      riskLevel: "medium" as const, score: 94, reason: "Promotion requires owner approval",
      createdAt: now
    },
    {
      id: "promo-demo-1", kind: "promotion" as const, title: "Bundle One Piece",
      subtitle: "OP-CHOPPER-01 + OP-LUFFY-01", status: "suggested",
      riskLevel: "low" as const, score: null, reason: "รอเจ้าของร้านยืนยันสินค้าที่เข้าชุด",
      createdAt: now
    },
    {
      id: "promo-demo-2", kind: "promotion" as const, title: "Free Gift Molly",
      subtitle: "MOLLY-SPACE-01", status: "suggested",
      riskLevel: "medium" as const, score: null, reason: "ต้องกำหนดต้นทุนของแถม",
      createdAt: now
    }
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    mode: "demo",
    summary: {
      total: mergedPromotions.length,
      suggested: mergedPromotions.filter((item) => item.status === "suggested").length,
      approved: mergedPromotions.filter((item) => item.status === "approved").length,
      rejected: mergedPromotions.filter((item) => item.status === "rejected").length,
      hold: mergedPromotions.filter((item) => item.status === "hold").length
    },
    promotions: mergedPromotions,
    approvals
  };
}
