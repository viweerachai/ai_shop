import { DashboardData } from "../types/dashboard.js";
import { strategyActionStore } from "../runtime/strategyActionStore.js";
import { getSystemSettings } from "../runtime/systemSettings.js";
import { visibleActionArtifacts } from "./strategyArtifacts.js";

export function createDemoDashboard(): DashboardData {
  const now = new Date();
  const settings = getSystemSettings();
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(9, 0, 0, 0);
  const data: DashboardData = {
    mode: "demo",
    generatedAt: now.toISOString(),
    systemHealth: "healthy",
    autoMode: settings.autoMode,
    autoPublish: settings.autoPublish,
    lastRun: new Date(now.getTime() - 35 * 60_000).toISOString(),
    nextRun: next.toISOString(),
    metrics: [
      { id: "products", label: "สินค้าทั้งหมด", value: 128, unit: "รายการ", note: "เพิ่มขึ้น 12 รายการ", tone: "blue" },
      { id: "content", label: "คอนเทนต์ที่สร้าง", value: 18, unit: "โพสต์", note: "เสร็จแล้ว 12 โพสต์", tone: "green" },
      { id: "owner", label: "รออนุมัติ", value: 3, unit: "โพสต์", note: "ต้องตรวจสอบ", tone: "purple" },
      { id: "ready", label: "พร้อมโพสต์", value: 5, unit: "โพสต์", note: "รอโพสต์อัตโนมัติ", tone: "yellow" },
      { id: "errors", label: "ข้อผิดพลาด", value: 0, unit: "รายการ", note: "ระบบปกติ", tone: "pink" }
    ],
    workflow: [
      { id: "product", label: "สินค้า", description: "ตรวจสินค้าใหม่", status: "completed", count: 12 },
      { id: "marketing", label: "การตลาด", description: "วางแผนแคมเปญ", status: "completed", count: 1 },
      { id: "content", label: "คอนเทนต์", description: "เขียนคอนเทนต์", status: "running", count: 3 },
      { id: "image", label: "ภาพ", description: "สร้างแผนภาพ", status: "waiting", count: 5 },
      { id: "promotion", label: "โปรโมชั่น", description: "ตรวจโปรโมชั่น", status: "waiting", count: 2 },
      { id: "report", label: "รายงาน", description: "สรุปรายงาน", status: "waiting", count: 1 }
    ],
    readyContent: [
      { id: "demo-1", title: "มาใหม่! Sonny Angel Animal Series Version 4", product: "Sonny Angel V4", platform: "Facebook, Instagram", publishDate: "10:00", ownerStatus: "approved", riskLevel: "low", contentType: "new_arrival" },
      { id: "demo-2", title: "One Piece Figure - Tony Tony Chopper", product: "Chopper Figure", platform: "Facebook, TikTok", publishDate: "13:00", ownerStatus: "approved", riskLevel: "low", contentType: "knowledge" },
      { id: "demo-3", title: "คู่หูสุดคุ้ม One Piece Set", product: "One Piece Set", platform: "Facebook", publishDate: "พรุ่งนี้", ownerStatus: "pending", riskLevel: "medium", contentType: "bundle" },
      { id: "demo-4", title: "สินค้าในสต็อกที่น่าสนใจประจำสัปดาห์", product: "หลายสินค้า", platform: "Instagram", publishDate: "ศุกร์", ownerStatus: "pending", riskLevel: "medium", contentType: "promotion" }
    ],
    alerts: [
      { id: "a1", type: "warning", message: "คอนเทนต์ 3 โพสต์รอการตรวจสอบ", age: "5 นาทีที่แล้ว" },
      { id: "a2", type: "info", message: "สินค้าใหม่ 2 รายการพร้อมประมวลผล", age: "15 นาทีที่แล้ว" },
      { id: "a3", type: "success", message: "ระบบทำงานปกติ", age: "30 นาทีที่แล้ว" }
    ],
    timeline: [
      { time: "09:00", label: "AI CEO Review", status: "completed" },
      { time: "09:15", label: "Marketing Campaign", status: "completed" },
      { time: "09:30", label: "Content Writer", status: "running" },
      { time: "10:00", label: "Content QA", status: "waiting" },
      { time: "10:30", label: "Image Planner", status: "waiting" },
      { time: "11:00", label: "Report Summary", status: "waiting" }
    ],
    ceo: {
      status: "กำลังทำงาน",
      salesSource: "sales_orders (demo)",
      salesSummary: {
        orders30d: 29,
        units30d: 49,
        revenue30d: 54630,
        topProduct: "Sonny Angel Animal Series Version 4"
      },
      shopPriority: "สินค้าเข้าใหม่และสินค้าที่พร้อมขายควรถูกดันก่อนงาน routine",
      weeklyDirection: "ใช้สินค้าเข้าใหม่เป็นหัวขบวน แล้วให้ marketing แตก theme ต่อเนื่องทั้ง knowledge และ engagement",
      recommendation: "จัดลำดับสินค้าใหม่และวางกลยุทธ์คอนเทนต์สำหรับวันนี้",
      instructions: [
        "ดันสินค้าใหม่ Sonny Angel เป็นอันดับ 1",
        "ใช้ Chopper เป็นสินค้ารองสำหรับรีวิวและ conversion",
        "จำกัดโปรของ Totoro จนกว่าจะเช็ก stock เพิ่ม",
        "หลีกเลี่ยงการโพสต์โปรโมชั่นที่ยังไม่อนุมัติ"
      ],
      drivers: [
        "29 ออเดอร์ใน 30 วันล่าสุดจาก sales_orders (demo)",
        "3 สินค้าเข้าใหม่พร้อมนำมาวางแผน",
        "3 คอนเทนต์ยังรอ owner approval",
        "2 โปรโมชั่นยังอยู่ในคิวอนุมัติ"
      ],
      watchouts: [
        "Totoro Mini Figure Set ขายต่อเนื่อง แต่ stock เหลือเพียง 5 ชิ้น",
        "Labubu Macaron ยังเป็นสินค้าความเสี่ยงสูง ห้ามดันขายตรง",
        "DIMOO เป็นพรีออเดอร์ ต้องย้ำเงื่อนไขก่อนสื่อสาร",
        "Promotion ที่ยังไม่อนุมัติห้ามสื่อสารหน้าโพสต์"
      ],
      activeTasks: [],
      recentHistory: [],
      recentArtifacts: [],
      actions: [
        {
          id: "hero-sonny",
          title: "ดัน SA-ANIMAL-V4 เป็น hero content วันนี้",
          owner: "Marketing",
          priority: "high",
          status: "ready",
          reason: "Top seller และเป็นสินค้าเข้าใหม่ จึงเหมาะเป็นหัวขบวนของแคมเปญ",
          source: "sales",
          sku: "SA-ANIMAL-V4"
        },
        {
          id: "restock-totoro",
          title: "เช็ก stock ของ GHIBLI-TOTORO-01",
          owner: "Manager",
          priority: "high",
          status: "ready",
          reason: "ขาย 3 ชิ้นใน 7 วันล่าสุด แต่ stock เหลือ 5 ชิ้น",
          source: "sales",
          sku: "GHIBLI-TOTORO-01"
        },
        {
          id: "owner-approval-shared",
          title: "เคลียร์ owner approval คิวค้าง",
          owner: "Owner",
          priority: "high",
          status: "blocked",
          reason: "ยังมีคอนเทนต์และโปรโมชั่นที่ต้องยืนยันก่อนเดิน workflow ต่อ",
          source: "content"
        },
        {
          id: "promo-gate-shared",
          title: "คัดโปรโมชั่นที่พร้อมจริงก่อนสื่อสาร",
          owner: "Manager",
          priority: "medium",
          status: "watch",
          reason: "โปรโมชั่นที่ยังไม่อนุมัติห้ามโพสต์ ต้องเช็ก margin และกฎร้านก่อน",
          source: "promotion"
        }
      ],
      priorityProducts: [
        { sku: "SA-ANIMAL-V4", name: "Sonny Angel Animal Series Version 4", reason: "Top seller • สินค้าเข้าใหม่ • พร้อมขาย • ขาย 6 ชิ้นใน 7 วันล่าสุด", stock: 18, riskLevel: "low", salesLast7d: 6, salesLast30d: 14 },
        { sku: "OP-CHOPPER-01", name: "One Piece Figure - Tony Tony Chopper", reason: "Top seller • มี opened photo และ video • ขาย 4 ชิ้นใน 7 วันล่าสุด", stock: 7, riskLevel: "low", salesLast7d: 4, salesLast30d: 11 },
        { sku: "GHIBLI-TOTORO-01", name: "Totoro Mini Figure Set", reason: "Restock risk • ขาย 3 ชิ้นใน 7 วันล่าสุด แต่ stock เหลือ 5 ชิ้น", stock: 5, riskLevel: "low", salesLast7d: 3, salesLast30d: 8 }
      ]
    }
  };
  data.ceo.actions = strategyActionStore.apply(data.ceo.actions);
  const actionSnapshot = strategyActionStore.snapshot();
  data.ceo.activeTasks = actionSnapshot.activeTasks;
  data.ceo.recentHistory = actionSnapshot.recentHistory;
  data.ceo.recentArtifacts = visibleActionArtifacts(actionSnapshot.recentArtifacts);
  data.alerts = [
    ...data.alerts,
    ...data.ceo.recentArtifacts.slice(0, 2).map((artifact) => ({
      id: `artifact-${artifact.artifactId}`,
      type: "info" as const,
      message: `${artifact.title} ถูกส่งเข้าคิวงานแล้ว`,
      age: artifact.status === "done" ? "พร้อมส่งต่อ workflow" : "จาก action queue"
    }))
  ].slice(0, 5);
  return data;
}
