import { MarketingView } from "../types/marketingView.js";
import { strategyActionStore } from "../runtime/strategyActionStore.js";
import { visibleActionArtifacts } from "./strategyArtifacts.js";

export function getDemoMarketing(): MarketingView {
  const data: MarketingView = {
    mode: "demo",
    campaign: {
      name: "New Arrival Collector Week",
      targetCustomer: "นักสะสม Art Toy และฟิกเกอร์ญี่ปุ่น อายุ 20-40 ปี",
      keyMessage: "พบสินค้าเข้าใหม่ พร้อมข้อมูลจริงและภาพสินค้าจากร้าน",
      contentMix: ["new_arrival 35%", "knowledge 25%", "engagement 20%", "review 10%", "promotion 10%"],
      productFocus: [
        { sku: "SA-ANIMAL-V4", name: "Sonny Angel Animal Series Version 4", reason: "Top seller • สินค้าเข้าใหม่ • พร้อมขาย • ขายดี 6 ชิ้นใน 7 วันล่าสุด", stock: 18, riskLevel: "low", score: 96, salesLast7d: 6, salesLast30d: 14, revenueLast30d: 8260 },
        { sku: "OP-CHOPPER-01", name: "One Piece Figure - Tony Tony Chopper", reason: "Top seller • มี opened photo / video • ทำรีวิวได้ • ขาย 4 ชิ้นใน 7 วัน", stock: 7, riskLevel: "low", score: 91, salesLast7d: 4, salesLast30d: 11, revenueLast30d: 14190 },
        { sku: "GHIBLI-TOTORO-01", name: "Totoro Mini Figure Set", reason: "Restock risk • ขายต่อเนื่อง 3 ชิ้นใน 7 วัน แต่ stock เหลือ 5 ชิ้น", stock: 5, riskLevel: "low", score: 84, salesLast7d: 3, salesLast30d: 8, revenueLast30d: 15120 }
      ],
      ideas: [
        "แนะนำ Sonny Angel ซีรีส์ใหม่พร้อมย้ำว่า Blind Box เป็นแบบสุ่ม",
        "โพสต์ความรู้วิธีดูแลฟิกเกอร์ One Piece",
        "Engagement ชวนเลือกธีมสะสมที่ชอบโดยไม่อ้างว่าเลือกลายในกล่องได้",
        "แจ้งเงื่อนไขพรีออเดอร์ DIMOO ให้ชัดเจน"
      ],
      promotionIdeas: [
        "เสนอ Bundle ฟิกเกอร์ One Piece สำหรับเจ้าของร้านพิจารณา",
        "เสนอของแถมแทนส่วนลดสำหรับสินค้าที่ไม่ทราบ margin"
      ],
      warnings: [
        "ห้ามสร้าง Unboxing สำหรับ Sonny Angel เพราะไม่มี opened_photo หรือ video",
        "Promotion ทุกชิ้นต้องรอเจ้าของร้านอนุมัติ",
        "สินค้าความเสี่ยงสูงห้ามเข้าสู่คิวโพสต์อัตโนมัติ"
      ],
      generatedAt: new Date().toISOString()
    },
    strategy: {
      shopPriority: "ให้สินค้าเข้าใหม่เป็นหัวแคมเปญ และใช้สินค้าที่มี asset จริงต่อยอดเป็นคอนเทนต์หลายแบบ",
      weeklyDirection: "เปิดด้วย new arrival แล้วตามด้วย knowledge, review และ engagement เพื่อเร่ง conversion แบบไม่ฝืนกฎร้าน",
      marketingInstruction: "ใช้ Sonny Angel เป็น hero product แล้วดึง Chopper เป็นสินค้ารองสำหรับโพสต์รีวิว",
      managerInstruction: "ห้ามให้ preorder หรือสินค้าความเสี่ยงสูงหลุดเข้า auto-post โดยไม่มี owner review",
      salesSource: "sales_orders (demo)",
      drivers: [
        "29 ออเดอร์ใน 30 วันล่าสุด",
        "ขายรวม 49 ชิ้น รายได้ 54,630 บาท",
        "3 สินค้าเข้าใหม่พร้อมเป็นจุดเริ่มของแคมเปญ",
        "2 โปรโมชั่นยังอยู่ในคิวรออนุมัติ",
        "มีสินค้าที่ asset ครบพอทำหลาย format"
      ],
      watchouts: [
        "Totoro ขายดีแต่ stock เริ่มตึง ถ้าจะดันโปรต้องเช็กของก่อน",
        "Unboxing ใช้ไม่ได้ถ้ายังไม่มี opened_photo หรือ video",
        "Promotion ทุกชิ้นต้องผ่าน owner approval",
        "สินค้าความเสี่ยงสูงห้ามใช้ข้อความเกินจริง"
      ],
      nextMoves: [
        "แตก theme คอนเทนต์ต่อจาก SA-ANIMAL-V4",
        "ใช้ Chopper เป็นโพสต์รีวิวและความรู้",
        "กัน Totoro ไว้ในคิวขายแบบจำกัดรอบจนกว่าจะเช็ก stock",
        "กัน DIMOO ไว้ในคิว owner review ก่อนสื่อสาร"
      ],
      activeTasks: [],
      recentHistory: [],
      recentArtifacts: [],
      actions: [
        {
          id: "hero-sonny",
          title: "วาง SA-ANIMAL-V4 เป็น hero content ของสัปดาห์",
          owner: "Marketing",
          priority: "high",
          status: "ready",
          reason: "Top seller และเป็นสินค้าเข้าใหม่ จึงเหมาะกับโพสต์เปิดแคมเปญ",
          source: "sales",
          sku: "SA-ANIMAL-V4"
        },
        {
          id: "review-chopper",
          title: "ใช้ OP-CHOPPER-01 ทำรีวิวและโพสต์ conversion",
          owner: "Marketing",
          priority: "medium",
          status: "ready",
          reason: "มี opened photo และ video พร้อมรองรับรีวิว",
          source: "sales",
          sku: "OP-CHOPPER-01"
        },
        {
          id: "restock-totoro",
          title: "ประสาน Manager เช็ก stock ของ GHIBLI-TOTORO-01",
          owner: "Manager",
          priority: "high",
          status: "watch",
          reason: "ยอดขายยังดี แต่ stock เหลือเพียง 5 ชิ้นก่อนดันโปรเพิ่ม",
          source: "sales",
          sku: "GHIBLI-TOTORO-01"
        },
        {
          id: "owner-approval-shared",
          title: "ค้าง owner approval ต้องเคลียร์ก่อนปล่อยโพสต์",
          owner: "Owner",
          priority: "high",
          status: "blocked",
          reason: "มีคอนเทนต์และโปรโมชั่นที่ยังไม่ควรหลุดไปหน้าร้าน",
          source: "content"
        }
      ]
    },
    summary: {
      eligibleProducts: 3,
      newArrivals: 3,
      promotionCandidates: 2,
      contentPlanned: 7,
      salesOrders30d: 29,
      revenue30d: 54630
    }
  };
  data.strategy.actions = strategyActionStore.apply(data.strategy.actions);
  const actionSnapshot = strategyActionStore.snapshot();
  data.strategy.activeTasks = actionSnapshot.activeTasks;
  data.strategy.recentHistory = actionSnapshot.recentHistory;
  data.strategy.recentArtifacts = visibleActionArtifacts(actionSnapshot.recentArtifacts);
  return data;
}
