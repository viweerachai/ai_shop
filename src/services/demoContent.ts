import { ContentListResponse, ContentViewItem } from "../types/contentView.js";
import { strategyActionStore } from "../runtime/strategyActionStore.js";
import { createActionContentView, visibleActionArtifacts } from "./strategyArtifacts.js";

const now = new Date().toISOString();
const demoContent: ContentViewItem[] = [
  {
    id: "content-demo-1", week: "2026-W25", contentType: "new_arrival",
    theme: "Sonny Angel Animal Series Version 4 เข้าใหม่",
    productSku: "SA-ANIMAL-V4", productName: "Sonny Angel Animal Series Version 4",
    platform: "Facebook, Instagram", status: "ready_to_write",
    idea: "เปิดตัวสินค้าใหม่ด้วยภาพสินค้าจริงและข้อมูลแบบกระชับ",
    caption: "", hashtags: [], writerNote: "CEO priority product | Campaign: New Arrival Collector Week | Brief: ใช้สินค้าเข้าใหม่เป็นตัวนำของแคมเปญ", riskNote: "Guardrail: ห้ามใช้ถ้อยคำสื่อว่าเลือกลายได้", riskLevel: "low",
    strategyLabels: ["CEO priority", "Campaign brief", "Blind box guardrail"],
    qaStatus: "", qaScore: 0, qaIssues: [], qaNote: "", rewriteInstruction: "",
    imageStatus: "", ownerStatus: "", publishDate: "2026-06-17 10:00", updatedAt: now
  },
  {
    id: "content-demo-2", week: "2026-W25", contentType: "knowledge",
    theme: "วิธีดูแลฟิกเกอร์ One Piece",
    productSku: "OP-CHOPPER-01", productName: "One Piece Figure - Tony Tony Chopper",
    platform: "Facebook", status: "content_ready_for_qa",
    idea: "ให้ความรู้เรื่องการเก็บรักษาฟิกเกอร์",
    caption: "เก็บฟิกเกอร์ให้สวยนาน ควรหลีกเลี่ยงแดดตรงและเช็ดฝุ่นด้วยแปรงขนนุ่มเป็นประจำ",
    hashtags: ["#OnePiece", "#FigureCare"], writerNote: "Campaign: New Arrival Collector Week | ใช้โทนให้ความรู้", riskNote: "", riskLevel: "low",
    strategyLabels: ["Campaign brief"],
    qaStatus: "", qaScore: 0, qaIssues: [], qaNote: "", rewriteInstruction: "",
    imageStatus: "", ownerStatus: "", publishDate: "2026-06-17 13:00", updatedAt: now
  },
  {
    id: "content-demo-3", week: "2026-W25", contentType: "new_arrival",
    theme: "Sonny Angel Animal Series Version 4",
    productSku: "SA-ANIMAL-V4", productName: "Sonny Angel Animal Series Version 4",
    platform: "Instagram", status: "needs_rewrite",
    idea: "แนะนำลายในซีรีส์",
    caption: "เลือกลายที่ชอบได้เลยจาก Sonny Angel ซีรีส์ใหม่",
    hashtags: ["#SonnyAngel"], writerNote: "CEO priority product | Brief: ใช้สินค้าเข้าใหม่เป็นตัวนำของแคมเปญ", riskNote: "Blind Box wording | Guardrail: ห้ามใช้ถ้อยคำสื่อว่าเลือกลายได้",
    strategyLabels: ["CEO priority", "Blind box guardrail"],
    riskLevel: "medium", qaStatus: "failed", qaScore: 58,
    qaIssues: ["Blind Box random/no-selection wording is missing"],
    qaNote: "ข้อความสื่อว่าสามารถเลือกลายได้",
    rewriteInstruction: "ระบุว่าสินค้าเป็นแบบสุ่มและไม่สามารถเลือกลายได้",
    imageStatus: "", ownerStatus: "", publishDate: "", updatedAt: now
  },
  {
    id: "content-demo-4", week: "2026-W25", contentType: "promotion",
    theme: "One Piece Bundle Weekend",
    productSku: "OP-CHOPPER-01", productName: "One Piece Figure - Tony Tony Chopper",
    platform: "Facebook", status: "owner_review_required",
    idea: "เสนอ bundle สำหรับสุดสัปดาห์",
    caption: "เซ็ต One Piece สำหรับนักสะสม รายละเอียดโปรดรอการยืนยันจากร้าน",
    hashtags: ["#OnePiece", "#Bundle"], writerNote: "Campaign support product | Brief: ใช้สินค้ารองสร้าง conversion post", riskNote: "Promotion requires owner approval",
    strategyLabels: ["Campaign brief", "Owner approval"],
    riskLevel: "medium", qaStatus: "passed", qaScore: 94, qaIssues: [],
    qaNote: "QA ผ่าน แต่เป็นโปรโมชั่น", rewriteInstruction: "",
    imageStatus: "image_brief_ready", ownerStatus: "pending",
    publishDate: "2026-06-20 10:00", updatedAt: now
  },
  {
    id: "content-demo-5", week: "2026-W25", contentType: "knowledge",
    theme: "เริ่มสะสม Art Toy อย่างไร",
    productSku: "", productName: "คอนเทนต์ทั่วไป",
    platform: "Facebook, Instagram", status: "ready_to_post",
    idea: "คำแนะนำสำหรับนักสะสมมือใหม่",
    caption: "เริ่มจากธีมที่ชอบ กำหนดงบ และเก็บข้อมูลรุ่นที่สนใจก่อนตัดสินใจสะสม",
    hashtags: ["#ArtToy", "#CollectorTips"], writerNote: "", riskNote: "",
    strategyLabels: [],
    riskLevel: "low", qaStatus: "passed", qaScore: 97, qaIssues: [],
    qaNote: "ผ่านการตรวจ", rewriteInstruction: "", imageStatus: "image_brief_ready",
    ownerStatus: "approved", publishDate: "2026-06-18 18:00", updatedAt: now
  }
];

export function getDemoContent(): ContentListResponse {
  const actionContent = visibleActionArtifacts(strategyActionStore.snapshot().recentArtifacts)
    .filter((artifact) => artifact.kind === "content_plan")
    .map((artifact) => createActionContentView(artifact));
  const content = [...actionContent, ...demoContent].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return {
    mode: "demo",
    summary: {
      total: content.length,
      readyToWrite: content.filter((item) => item.status === "ready_to_write").length,
      waitingQa: content.filter((item) => item.status === "content_ready_for_qa").length,
      needsRewrite: content.filter((item) => item.status === "needs_rewrite").length,
      ownerReview: content.filter((item) => item.status === "owner_review_required").length,
      readyToPost: content.filter((item) => item.status === "ready_to_post").length
    },
    content
  };
}
