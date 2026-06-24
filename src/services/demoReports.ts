import { ReportView } from "../types/reportView.js";

export function createDemoReport(): ReportView {
  const generatedAt = new Date().toISOString();
  return {
    mode: "demo",
    generatedAt,
    healthScore: 82,
    sales: {
      sourceLabel: "sales_orders (demo)",
      totalOrders30d: 29,
      totalUnits30d: 49,
      totalRevenue30d: 54630,
      topProduct: "Sonny Angel Animal Series Version 4"
    },
    summaryText: [
      "AI Shop Daily Report",
      "สินค้าพร้อมขาย 3 รายการ และสินค้าใหม่ยังควรดันก่อนสินค้าสต็อกปกติ",
      "คอนเทนต์ที่เสี่ยงอยู่ที่ Blind Box wording และ Promotion approval",
      "Next recommended action: ตรวจ Owner Approval และแก้คอนเทนต์ Sonny Angel Blind Box"
    ].join("\n"),
    metrics: [
      { id: "ready-products", label: "สินค้าพร้อมขาย", value: 3, unit: "รายการ", note: "พร้อมใช้ทำคอนเทนต์", tone: "blue" },
      { id: "content-pipeline", label: "คอนเทนต์ในระบบ", value: 5, unit: "โพสต์", note: "พร้อมโพสต์ 1 โพสต์", tone: "green" },
      { id: "owner-queue", label: "รอเจ้าของร้าน", value: 3, unit: "รายการ", note: "รวมคอนเทนต์และโปรโมชั่น", tone: "purple" },
      { id: "promo-active", label: "โปรโมชันอนุมัติ", value: 1, unit: "แคมเปญ", note: "มี 2 รายการรออนุมัติ", tone: "yellow" },
      { id: "risk-items", label: "ประเด็นเสี่ยง", value: 3, unit: "จุด", note: "ไม่มี workflow ล้มเหลว", tone: "pink" }
    ],
    workflow: [
      { id: "product", label: "Product", completed: 3, waiting: 2, blocked: 1 },
      { id: "content", label: "Content", completed: 1, waiting: 3, blocked: 1 },
      { id: "image", label: "Image", completed: 3, waiting: 1, blocked: 0 },
      { id: "promotion", label: "Promotion", completed: 1, waiting: 2, blocked: 1 }
    ],
    risks: [
      {
        id: "risk-product-labubu",
        source: "product",
        title: "Labubu Macaron Blind Box",
        status: "needs_product_rewrite",
        riskLevel: "high",
        note: "ข้อความเดิมสื่อว่าสามารถเลือกลายได้"
      },
      {
        id: "risk-content-sonny",
        source: "content",
        title: "Sonny Angel Animal Series Version 4",
        status: "needs_rewrite",
        riskLevel: "medium",
        note: "ต้องระบุว่าสินค้าเป็นแบบสุ่มและไม่สามารถเลือกลายได้"
      },
      {
        id: "risk-promo-molly",
        source: "promotion",
        title: "Molly Space Adventure",
        status: "hold",
        riskLevel: "medium",
        note: "Direct discount requires cost and margin data."
      }
    ],
    recommendations: [
      {
        id: "rec-owner-approval",
        priority: "high",
        title: "เคลียร์ Owner Approval ก่อนสร้างโพสต์เพิ่ม",
        detail: "มีทั้งคอนเทนต์โปรโมชันและ bundle ที่ต้องยืนยันก่อนเอาไปใช้จริง",
        owner: "เจ้าของร้าน"
      },
      {
        id: "rec-blind-box",
        priority: "high",
        title: "แก้ข้อความ Blind Box ให้ชัด",
        detail: "โพสต์ Sonny Angel ต้องบอกว่าเป็นแบบสุ่มและไม่สามารถเลือกลายได้",
        owner: "Content QA"
      },
      {
        id: "rec-assets",
        priority: "medium",
        title: "เพิ่ม opened_photo ให้สินค้าที่ต้องทำรีวิว",
        detail: "สินค้าบางตัวมีเฉพาะ box_photo จึงยังทำ Unboxing หรือ Review ไม่ได้",
        owner: "Product Specialist"
      },
      {
        id: "rec-restock-totoro",
        priority: "high",
        title: "เช็ก stock ของ Totoro ก่อนดันโปรต่อ",
        detail: "Totoro Mini Figure Set ขาย 3 ชิ้นใน 7 วันล่าสุด แต่ stock เหลือเพียง 5 ชิ้น",
        owner: "Manager"
      },
      {
        id: "rec-slow-molly",
        priority: "medium",
        title: "ใช้ bundle หรือของแถมช่วย Molly",
        detail: "Molly มี stock สูงแต่ไม่มี margin ครบ จึงควรใช้เส้นทางโปรที่ระวังมากกว่าส่วนลดตรง",
        owner: "Marketing"
      }
    ]
  };
}
