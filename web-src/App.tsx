import {
  AlertTriangle,
  BarChart3,
  Bot,
  Box,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock3,
  FileBarChart,
  Gift,
  Image,
  LayoutDashboard,
  Megaphone,
  Menu,
  MessageSquare,
  PackageCheck,
  PenLine,
  Play,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Tags,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "./apiClient";
import { ProductsPage } from "./ProductsPage";
import { MarketingPage } from "./MarketingPage";
import { ContentPage } from "./ContentPage";
import { ImagePage } from "./ImagePage";
import { PromotionPage } from "./PromotionPage";
import { ReportPage } from "./ReportPage";
import { SettingsPage } from "./SettingsPage";
import { OverviewPage } from "./OverviewPage";
import { AgentLogsPage } from "./AgentLogsPage";
import { StrategyActionPanel } from "./StrategyActionPanel";
import { StrategyActionActivity } from "./StrategyActionActivity";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import { AICeoChatPopup } from "./AICeoChatPopup";

type NavigationContext = {
  sku?: string;
  contentId?: string;
  promotionId?: string;
  query?: string;
  tab?: "promotions" | "approvals";
};

type DashboardData = {
  mode: "live" | "demo";
  generatedAt: string;
  systemHealth: "healthy" | "warning" | "error";
  autoMode: string;
  autoPublish: boolean;
  lastRun: string;
  nextRun: string;
  metrics: Array<{ id: string; label: string; value: number; unit: string; note: string; tone: string }>;
  workflow: Array<{ id: string; label: string; description: string; status: "completed" | "running" | "waiting" | "attention" | "failed"; count: number }>;
  readyContent: Array<{ id: string; title: string; product: string; platform: string; publishDate: string; ownerStatus: string; riskLevel: string; contentType: string }>;
  alerts: Array<{ id: string; type: string; message: string; age: string }>;
  timeline: Array<{ time: string; label: string; status: string }>;
  ceo: {
    status: string;
    salesSource: string;
    salesSummary: {
      orders30d: number;
      units30d: number;
      revenue30d: number;
      topProduct: string;
    };
    shopPriority: string;
    weeklyDirection: string;
    recommendation: string;
    instructions: string[];
    drivers: string[];
    watchouts: string[];
    actions: Array<{ id: string; title: string; owner: "CEO" | "Marketing" | "Manager" | "Owner"; priority: "high" | "medium" | "low"; status: "ready" | "in_progress" | "completed" | "watch" | "blocked"; reason: string; source: "sales" | "content" | "promotion" | "operations"; sku?: string }>;
    activeTasks: Array<{ taskId: string; actionId: string; title: string; owner: "CEO" | "Marketing" | "Manager" | "Owner"; status: "open" | "done" | "canceled"; source: "sales" | "content" | "promotion" | "operations"; detail: string; sku?: string; createdAt: string; updatedAt: string }>;
    recentHistory: Array<{ historyId: string; actionId: string; title: string; transition: "started" | "completed" | "reset" | "status_changed"; fromStatus: "ready" | "in_progress" | "completed" | "watch" | "blocked" | "none"; toStatus: "ready" | "in_progress" | "completed" | "watch" | "blocked" | "none"; createdAt: string; note: string }>;
    recentArtifacts: Array<{ artifactId: string; actionId: string; kind: "content_plan" | "promotion_plan" | "stock_followup"; status: "draft" | "open" | "done" | "canceled"; title: string; summary: string; owner: "CEO" | "Marketing" | "Manager" | "Owner"; sku?: string; createdAt: string; updatedAt: string }>;
    priorityProducts: Array<{ sku: string; name: string; reason: string; stock: number | null; riskLevel: string; salesLast7d: number; salesLast30d: number }>;
  };
};


const navItems = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "overview", icon: BarChart3, label: "ภาพรวม" },
  { section: "WORKFLOWS" },
  { id: "products", icon: Box, label: "1. สินค้า (Product)" },
  { id: "marketing", icon: Megaphone, label: "2. การตลาด (Marketing)" },
  { id: "content", icon: PenLine, label: "3. คอนเทนต์ (Content)" },
  { id: "images", icon: Image, label: "4. ภาพ (Image)" },
  { id: "promotions", icon: Tags, label: "5. โปรโมชั่น (Promotion)" },
  { id: "reports", icon: FileBarChart, label: "6. รายงาน (Report)" },
  { section: "SYSTEM" },
  { id: "agent-logs", icon: MessageSquare, label: "AI Conversations" },
  { id: "settings", icon: Settings, label: "การตั้งค่า" }
];

const PAGE_META: Record<string, { title: string; description: string }> = {
  dashboard: { title: "Dashboard", description: "ภาพรวมการทำงานของระบบ AI" },
  overview: { title: "Operational Overview", description: "สรุปภาพรวมเชิงปฏิบัติการของร้าน, CEO, workflow, content และ alert ในหน้าเดียว" },
  products: { title: "สินค้าและ Assets", description: "ตรวจสอบข้อมูลสินค้าและความพร้อมสำหรับสร้างคอนเทนต์" },
  marketing: { title: "Marketing Strategy", description: "แผนการตลาดจาก AI CEO และข้อมูลสินค้าจริง" },
  content: { title: "Content & QA", description: "จัดการคิวเขียน ตรวจ QA แก้ไข และอนุมัติคอนเทนต์" },
  images: { title: "Image Plans", description: "ตรวจ Image Brief และความสอดคล้องกับ Assets จริง" },
  promotions: { title: "Promotions & Approval", description: "จัดการข้อเสนอโปรโมชั่นและคิวอนุมัติของเจ้าของร้าน" },
  reports: { title: "Daily Report", description: "สรุปผลการทำงาน ความเสี่ยง และ next actions จาก AI" },
  settings: { title: "System Settings", description: "ดู integration, import data, API docs และความพร้อมของ workflow" },
  "agent-logs": { title: "AI Conversations", description: "ดู prompt และ response ของ AI agent แต่ละตัว เพื่อ debug และตรวจคุณภาพ" }
};

const workflowIcons = [Box, Megaphone, PenLine, Image, Tags, BarChart3];
const metricIcons = [Box, PenLine, Bot, PackageCheck, AlertTriangle];

function formatThaiDate(value: string, withTime = false) {
  if (!value) return "ยังไม่มีข้อมูล";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
    timeZone: "Asia/Tokyo"
  }).format(new Date(value));
}

function statusLabel(status: string) {
  return {
    completed: "เสร็จสิ้น",
    running: "กำลังทำงาน",
    attention: "ต้องตรวจสอบ",
    waiting: "รอเริ่ม",
    failed: "ล้มเหลว"
  }[status] ?? status;
}

function parseDashboardPublishDate(value: string, reference: Date): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  const timeOnly = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (timeOnly) {
    const date = new Date(reference);
    date.setHours(Number(timeOnly[1]), Number(timeOnly[2]), 0, 0);
    return date;
  }
  if (trimmed === "พรุ่งนี้") {
    const date = new Date(reference);
    date.setDate(date.getDate() + 1);
    return date;
  }
  const weekdayMap: Record<string, number> = {
    "อาทิตย์": 0,
    "จันทร์": 1,
    "อังคาร": 2,
    "พุธ": 3,
    "พฤหัสบดี": 4,
    "พฤ": 4,
    "ศุกร์": 5,
    "เสาร์": 6
  };
  if (trimmed in weekdayMap) {
    const target = weekdayMap[trimmed];
    const date = new Date(reference);
    const delta = (target - date.getDay() + 7) % 7 || 7;
    date.setDate(date.getDate() + delta);
    return date;
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function readNavigationFromUrl(): { page: string; context: NavigationContext | null } {
  const params = new URLSearchParams(window.location.search);
  const page = params.get("page") ?? "dashboard";
  const context: NavigationContext = {};
  const sku = params.get("sku");
  const contentId = params.get("contentId");
  const promotionId = params.get("promotionId");
  const query = params.get("query");
  const tab = params.get("tab");
  if (sku) context.sku = sku;
  if (contentId) context.contentId = contentId;
  if (promotionId) context.promotionId = promotionId;
  if (query) context.query = query;
  if (tab === "promotions" || tab === "approvals") context.tab = tab;
  return { page, context: Object.keys(context).length ? context : null };
}

export function App() {
  const initialNavigation = typeof window === "undefined" ? { page: "dashboard", context: null } : readNavigationFromUrl();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [activePage, setActivePage] = useState(initialNavigation.page);
  const [navigationContext, setNavigationContext] = useState<NavigationContext | null>(initialNavigation.context);

  function navigate(page: string, context?: NavigationContext) {
    setActivePage(page);
    setNavigationContext(context ?? null);
    setMenuOpen(false);
  }

  const loadDashboard = useCallback(async () => {
    try {
      const response = await apiFetch("/api/dashboard");
      if (!response.ok) throw new Error("โหลดข้อมูล Dashboard ไม่สำเร็จ");
      setData(await response.json());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    const timer = window.setInterval(loadDashboard, 5_000);
    return () => window.clearInterval(timer);
  }, [loadDashboard]);

  useEffect(() => {
    const onPopState = () => {
      const next = readNavigationFromUrl();
      setActivePage(next.page);
      setNavigationContext(next.context);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("page", activePage);
    const entries = Object.entries(navigationContext ?? {});
    for (const key of ["sku", "contentId", "promotionId", "query", "tab"]) {
      url.searchParams.delete(key);
    }
    for (const [key, value] of entries) {
      if (value) url.searchParams.set(key, value);
    }
    window.history.replaceState({}, "", url);
  }, [activePage, navigationContext]);

  async function runNow() {
    setRunning(true);
    setMessage("");
    try {
      const response = await apiFetch("/api/workflows/auto:once/run", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "รันระบบไม่สำเร็จ");
      setMessage(`เริ่มการทำงานแล้ว Run ID: ${result.runId}`);
      await loadDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setRunning(false);
    }
  }

  async function changeMode(mode: string) {
    const response = await apiFetch("/api/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ autoMode: mode })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.error ?? "เปลี่ยนโหมดไม่สำเร็จ");
      return;
    }
    await loadDashboard();
  }

  if (loading || !data) {
    return (
      <div className="loading-screen">
        <Sparkles size={32} />
        <span>กำลังเตรียม AI Shop System...</span>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Gift size={30} /></div>
          <div><strong>AI SHOP SYSTEM</strong><span>AI ขายของอัตโนมัติ</span></div>
        </div>
        <nav>
          {navItems.map((item, index) =>
            item.section ? (
              <div className="nav-section" key={`${item.section}-${index}`}>{item.section}</div>
            ) : (
              <button
                className={activePage === item.id ? "nav-item active" : "nav-item"}
                key={`${item.id}-${item.label}`}
                onClick={() => {
                  navigate(item.id ?? "dashboard");
                }}
              >
                {item.icon && <item.icon size={19} />}
                <span>{item.label}</span>
              </button>
            )
          )}
        </nav>
        <div className="auto-box">
          <div className="eyebrow">AUTO MODE</div>
          <div className="online"><span /> ทำงานอัตโนมัติ</div>
          <label htmlFor="auto-mode">ระดับการทำงาน</label>
          <select id="auto-mode" value={data.autoMode} onChange={(event) => changeMode(event.target.value)}>
            <option value="semi_auto">Semi Auto</option>
            <option value="trusted_auto">Trusted Auto</option>
            <option value="full_auto">Full Auto</option>
          </select>
          <small>AUTO_PUBLISH: {data.autoPublish ? "เปิด" : "ปิด"}</small>
        </div>
        <div className="owner"><div className="owner-avatar">H</div><div><strong>House of Card</strong><span>เจ้าของร้าน</span></div></div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button
            className="mobile-menu"
            aria-label={menuOpen ? "ปิดเมนู" : "เปิดเมนู"}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
          <div>
            <h1>{(PAGE_META[activePage] ?? PAGE_META.dashboard).title}</h1>
            <p>{(PAGE_META[activePage] ?? PAGE_META.dashboard).description}</p>
          </div>
          <div className="top-chips">
            <div className="chip"><CalendarDays size={17} />{formatThaiDate(data.generatedAt)}</div>
            <div className="chip"><Clock3 size={17} />{new Date(data.generatedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</div>
            <div className={`chip health ${data.systemHealth}`}><ShieldCheck size={17} />ระบบทำงานปกติ</div>
            {data.mode === "demo" && <div className="chip demo">DEMO MODE</div>}
            <ThemeToggle />
            <NotificationBell onNavigate={navigate} />
          </div>
        </header>

        {message && <div className="toast"><CircleDot size={16} />{message}<button onClick={() => setMessage("")}><X size={15} /></button></div>}

        {activePage === "products" ? (
          <ProductsPage onMessage={setMessage} focusSku={navigationContext?.sku} />
        ) : activePage === "marketing" ? (
          <MarketingPage
            onMessage={setMessage}
            onNavigate={navigate}
            focusSku={navigationContext?.sku}
          />
        ) : activePage === "content" ? (
          <ContentPage
            onMessage={setMessage}
            focusContentId={navigationContext?.contentId}
            focusQuery={navigationContext?.query ?? navigationContext?.sku}
          />
        ) : activePage === "images" ? (
          <ImagePage onMessage={setMessage} onNavigate={navigate} />
        ) : activePage === "promotions" ? (
          <PromotionPage
            onMessage={setMessage}
            focusPromotionId={navigationContext?.promotionId}
            focusQuery={navigationContext?.query ?? navigationContext?.sku}
            initialTab={navigationContext?.tab}
          />
        ) : activePage === "reports" ? (
          <ReportPage onMessage={setMessage} onNavigate={navigate} />
        ) : activePage === "settings" ? (
          <SettingsPage onMessage={setMessage} />
        ) : activePage === "overview" ? (
          <OverviewPage data={data} onNavigate={navigate} />
        ) : activePage === "agent-logs" ? (
          <AgentLogsPage onMessage={setMessage} />
        ) : activePage === "dashboard" ? (
        <div className="dashboard-grid">
          <section className="content-column">
            <div className="panel workflow-panel">
              <div className="panel-title"><h2>ภาพรวม Workflow วันนี้</h2><span>อัปเดตอัตโนมัติทุก 5 วินาที</span></div>
              <div className="workflow-row">
                {data.workflow.map((stage, index) => {
                  const Icon = workflowIcons[index] ?? Sparkles;
                  return (
                    <div className={`workflow-wrap stage-${stage.status}`} key={stage.id}>
                      <div className="workflow-card">
                        <div className="workflow-icon"><Icon size={27} /></div>
                        <strong>{index + 1}. {stage.label}</strong>
                        <span>{stage.description}</span>
                        <div className="workflow-status">
                          {stage.status === "completed" ? <Check size={15} /> : stage.status === "running" ? <RefreshCw size={15} className="spin" /> : stage.status === "failed" ? <AlertTriangle size={15} /> : <Clock3 size={15} />}
                          {statusLabel(stage.status)}
                        </div>
                      </div>
                      {index < data.workflow.length - 1 && <div className="arrow">→</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="panel">
              <div className="panel-title"><h2>สรุปผลงานวันนี้</h2></div>
              <div className="metric-grid">
                {data.metrics.map((metric, index) => {
                  const Icon = metricIcons[index] ?? Sparkles;
                  return (
                    <div className={`metric-card tone-${metric.tone}`} key={metric.id}>
                      <div className="metric-head"><span className="metric-icon"><Icon size={21} /></span><span>{metric.label}</span></div>
                      <div className="metric-value">{metric.value}<small>{metric.unit}</small></div>
                      <div className="metric-note">{metric.note}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lower-grid">
              <div className="panel ready-panel">
                <div className="panel-title"><h2>คอนเทนต์ที่พร้อมโพสต์</h2><button onClick={() => navigate("content")}>ดูทั้งหมด</button></div>
                <div className="content-list">
                  {data.readyContent.length === 0 && <div className="empty-state">ยังไม่มีคอนเทนต์ในคิว</div>}
                  {data.readyContent.map((item, index) => (
                    <button
                      className="content-item"
                      key={item.id}
                      onClick={() => navigate("content", { contentId: item.id, query: item.product })}
                    >
                      <div className={`content-thumb thumb-${(index % 3) + 1}`}><PackageCheck size={22} /></div>
                      <div className="content-copy">
                        <strong>{item.title}</strong>
                        <div><span className="pill">{item.contentType}</span><span className={`pill ${item.ownerStatus === "approved" ? "green" : "yellow"}`}>{item.ownerStatus === "approved" ? "พร้อมโพสต์" : "รออนุมัติ"}</span></div>
                      </div>
                      <div className="content-meta"><span>{item.publishDate}</span><small>{item.platform}</small></div>
                    </button>
                  ))}
                </div>
              </div>
              <CalendarPanel data={data} onNavigate={navigate} />
            </div>

            <div className="panel action-queue-panel">
              <div className="panel-title">
                <h2>CEO Action Queue</h2>
                <span>{data.ceo.actions.length} งาน</span>
              </div>
              <StrategyActionPanel items={data.ceo.actions} onMessage={setMessage} onUpdated={loadDashboard} />
            </div>

            <div className="panel">
              <div className="panel-title"><h2>กิจกรรมล่าสุดของ Action Queue</h2></div>
              <StrategyActionActivity tasks={data.ceo.activeTasks} history={data.ceo.recentHistory} />
            </div>
          </section>

          <aside className="right-column">
            <div className="panel ceo-card">
              <div className="ceo-head">
                <div className="bot-avatar"><Bot size={36} /></div>
                <div><h2>AI CEO <span>(Claude)</span></h2><div className="online"><span />{data.ceo.status}</div></div>
              </div>
              <p>{data.ceo.recommendation}</p>
              <div className="ceo-card-actions">
                <button className="primary-action secondary-action" onClick={() => navigate("overview")}>ดูภาพรวมเต็ม</button>
                <AICeoChatPopup onUpdated={loadDashboard} />
              </div>
            </div>

            <div className="panel alerts-card">
              <div className="panel-title"><h2>การแจ้งเตือน</h2><button onClick={() => navigate("overview")}>ดูทั้งหมด</button></div>
              {data.alerts.length === 0 && <div className="empty-state">ไม่มีการแจ้งเตือน</div>}
              {data.alerts.map((alert) => (
                <button
                  className={`alert-row alert-${alert.type}`}
                  key={alert.id}
                  onClick={() => navigate(
                    alert.id.startsWith("promo-") ? "promotions" : alert.id.startsWith("qa-") ? "content" : "products",
                    { query: alert.message }
                  )}
                >
                  <span className="alert-icon">{alert.type === "warning" ? <AlertTriangle size={16} /> : alert.type === "success" ? <Check size={16} /> : <Box size={16} />}</span>
                  <strong>{alert.message}</strong><small>{alert.age}</small>
                </button>
              ))}
            </div>

            <div className="panel timeline-card">
              <div className="panel-title"><h2>งานที่กำลังทำอยู่</h2></div>
              <div className="timeline">
                {data.timeline.length === 0 && <div className="empty-state">ยังไม่มีประวัติการรันในรอบนี้</div>}
                {data.timeline.map((item) => (
                  <div className={`timeline-row timeline-${item.status}`} key={`${item.time}-${item.label}`}>
                    <time>{item.time}</time><span className="timeline-dot" /><strong>{item.label}</strong><small>{statusLabel(item.status)}</small>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
        ) : null}
      </main>

      <footer className="status-footer">
        <span className="online"><span /> Auto Mode ทำงานปกติ</span>
        <span>รันล่าสุด: {formatThaiDate(data.lastRun, true)}</span>
        <span>รันครั้งถัดไป: {formatThaiDate(data.nextRun, true)}</span>
        <button onClick={runNow} disabled={running}><Play size={15} />{running ? "กำลังรัน..." : "รันทันที"}</button>
      </footer>
    </div>
  );
}


function CalendarPanel({
  data,
  onNavigate
}: {
  data: DashboardData;
  onNavigate: (page: string, context?: NavigationContext) => void;
}) {
  const referenceDate = useMemo(() => new Date(data.generatedAt), [data.generatedAt]);
  const [monthOffset, setMonthOffset] = useState(0);
  const visibleDate = useMemo(
    () => new Date(referenceDate.getFullYear(), referenceDate.getMonth() + monthOffset, 1),
    [referenceDate, monthOffset]
  );
  const [selectedDay, setSelectedDay] = useState(() => referenceDate.getDate());
  const year = visibleDate.getFullYear();
  const month = visibleDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();

  useEffect(() => {
    setSelectedDay(monthOffset === 0 ? referenceDate.getDate() : 1);
  }, [monthOffset, referenceDate]);

  const calendarEvents = useMemo(() => data.readyContent.map((item, index) => {
    const parsed = parseDashboardPublishDate(item.publishDate, referenceDate);
    return {
      ...item,
      date: parsed ?? new Date(referenceDate.getFullYear(), referenceDate.getMonth(), Math.min(days, referenceDate.getDate() + index))
    };
  }), [data.readyContent, referenceDate, days]);

  const monthEvents = useMemo(() => calendarEvents.filter((item) =>
    item.date.getFullYear() === year && item.date.getMonth() === month
  ), [calendarEvents, year, month]);

  const eventDays = useMemo(() => new Set(monthEvents.map((item) => item.date.getDate())), [monthEvents]);
  const selectedEvents = useMemo(() => monthEvents.filter((item) => item.date.getDate() === selectedDay), [monthEvents, selectedDay]);
  const cells = useMemo(() => [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: days }, (_, index) => index + 1)
  ], [firstDay, days]);

  return (
    <div className="panel calendar-panel">
      <div className="panel-title"><h2>ปฏิทินคอนเทนต์</h2><button type="button" onClick={() => onNavigate("content", { query: selectedEvents[0]?.product })}>ดูปฏิทินเต็ม</button></div>
      <div className="calendar-head">
        <button type="button" aria-label="เดือนก่อนหน้า" onClick={() => setMonthOffset((value) => value - 1)}><ChevronLeft size={18} /></button>
        <strong>{visibleDate.toLocaleDateString("th-TH", { month: "long", year: "numeric" })}</strong>
        <button type="button" aria-label="เดือนถัดไป" onClick={() => setMonthOffset((value) => value + 1)}><ChevronRight size={18} /></button>
      </div>
      <div className="calendar-grid weekdays">{["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((day, index) => <span key={index}>{day}</span>)}</div>
      <div className="calendar-grid days">
        {cells.map((day, index) => day ? (
          <button
            type="button"
            className={`${day === referenceDate.getDate() && monthOffset === 0 ? "today" : ""} ${eventDays.has(day) ? "has-event" : ""} ${day === selectedDay ? "selected" : ""}`}
            key={`${day}-${index}`}
            onPointerDown={() => setSelectedDay(day)}
            onClick={() => setSelectedDay(day)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setSelectedDay(day);
              }
            }}
            aria-pressed={day === selectedDay}
            aria-label={`วันที่ ${day}${eventDays.has(day) ? " มีคอนเทนต์" : ""}`}
          >
            {day}
          </button>
        ) : <span className="empty-day" key={`${day}-${index}`} />)}
      </div>
      <div className="calendar-detail">
        <div className="calendar-detail-head">
          <strong>{selectedDay} {visibleDate.toLocaleDateString("th-TH", { month: "long" })}</strong>
          <span>{selectedEvents.length} รายการ</span>
        </div>
        <div className="calendar-detail-list">
          {selectedEvents.length
            ? selectedEvents.slice(0, 3).map((item) => (
              <button key={item.id} type="button" className="calendar-event" onClick={() => onNavigate("content", { contentId: item.id, query: item.product })}>
                <strong>{item.title}</strong>
                <span>{item.publishDate} • {item.platform}</span>
              </button>
            ))
            : <div className="empty-state">ไม่มีคอนเทนต์ในวันนี้</div>}
        </div>
        {selectedEvents[0] && (
          <button
            type="button"
            className="calendar-open-link"
            onClick={() => onNavigate("content", { contentId: selectedEvents[0].id, query: selectedEvents[0].product })}
          >
            เปิดคอนเทนต์ของวันนี้
          </button>
        )}
      </div>
      <div className="calendar-legend"><span><i className="green" />พร้อมโพสต์</span><span><i className="yellow" />รออนุมัติ</span><span><i className="blue" />โพสต์แล้ว</span><span><i className="pink" />โปรโมชั่น</span></div>
    </div>
  );
}
