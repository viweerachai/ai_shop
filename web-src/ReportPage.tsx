import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FileBarChart,
  Play,
  RefreshCw,
  ShieldAlert,
  Sparkles
} from "lucide-react";
import { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "./apiClient";

type ReportMetric = {
  id: string;
  label: string;
  value: number;
  unit: string;
  note: string;
  tone: "blue" | "green" | "purple" | "yellow" | "pink";
};

type ReportWorkflow = {
  id: string;
  label: string;
  completed: number;
  waiting: number;
  blocked: number;
};

type ReportRisk = {
  id: string;
  source: "product" | "content" | "promotion";
  title: string;
  status: string;
  riskLevel: "low" | "medium" | "high";
  note: string;
};

type ReportRecommendation = {
  id: string;
  priority: "high" | "medium" | "low";
  title: string;
  detail: string;
  owner: string;
};

type ReportData = {
  mode: "live" | "demo";
  generatedAt: string;
  summaryText: string;
  healthScore: number;
  sales: {
    sourceLabel: string;
    totalOrders30d: number;
    totalUnits30d: number;
    totalRevenue30d: number;
    topProduct: string;
  };
  metrics: ReportMetric[];
  workflow: ReportWorkflow[];
  risks: ReportRisk[];
  recommendations: ReportRecommendation[];
};

const metricIcons = [CheckCircle2, ClipboardList, Sparkles, BarChart3, AlertTriangle];

export function ReportPage({
  onMessage,
  onNavigate
}: {
  onMessage: (message: string) => void;
  onNavigate: (page: string, context?: { sku?: string; contentId?: string; promotionId?: string; query?: string; tab?: "promotions" | "approvals" }) => void;
}) {
  const [data, setData] = useState<ReportData | null>(null);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    const response = await apiFetch("/api/reports");
    if (!response.ok) throw new Error("โหลดรายงานไม่สำเร็จ");
    setData(await response.json());
  }, []);

  useEffect(() => {
    load().catch((error) => onMessage(error.message));
  }, [load, onMessage]);

  async function runReport() {
    setRunning(true);
    try {
      const response = await apiFetch("/api/workflows/report:daily/run", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "รันรายงานไม่สำเร็จ");
      onMessage(`สร้างรายงานแล้ว Run ID: ${result.runId}`);
      await load();
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setRunning(false);
    }
  }

  if (!data) return <div className="panel products-loading"><RefreshCw className="spin" /> กำลังโหลดรายงาน...</div>;

  function navigateWorkflow(id: ReportWorkflow["id"]) {
    const mapping: Record<ReportWorkflow["id"], { page: string; context?: { query?: string } }> = {
      product: { page: "products" },
      marketing: { page: "marketing" },
      content: { page: "content" },
      image: { page: "images" },
      promotion: { page: "promotions" },
      report: { page: "reports" }
    };
    const target = mapping[id];
    onNavigate(target.page, target.context);
  }

  return (
    <div className="report-page">
      <section className="panel report-hero">
        <div>
          <span className="eyebrow">DAILY OPERATIONS REPORT</span>
          <h2>Health Score {data.healthScore}/100</h2>
          <p>{data.summaryText.split("\n").slice(-1)[0]}</p>
        </div>
        <div className="report-gauge" style={{ "--score": data.healthScore } as CSSProperties}>
          <strong>{data.healthScore}</strong>
          <span>system health</span>
        </div>
        <button className="run-product-button" onClick={runReport} disabled={running}>
          {running ? <RefreshCw className="spin" size={16} /> : <Play size={16} />}
          {running ? "กำลังสร้าง..." : "รัน Daily Report"}
        </button>
      </section>

      <div className="report-metrics">
        {data.metrics.map((metric, index) => {
          const Icon = metricIcons[index] ?? FileBarChart;
          return (
            <div className={`panel marketing-metric tone-${metric.tone}`} key={metric.id}>
              <span><Icon size={20} /></span>
              <div><strong>{metric.value}</strong><small>{metric.label}</small><em>{metric.note}</em></div>
            </div>
          );
        })}
      </div>

      <section className="panel report-sales">
        <div className="product-table-head"><div><h2>Sales Order Data</h2><span>แหล่งข้อมูลที่ CEO และ Marketing ใช้อ้างอิง</span></div><BarChart3 /></div>
        <div className="report-sales-grid">
          <button type="button" onClick={() => onNavigate("settings")}><span>Source</span><strong>{data.sales.sourceLabel}</strong></button>
          <button type="button" onClick={() => onNavigate("marketing")}><span>Orders 30d</span><strong>{data.sales.totalOrders30d}</strong></button>
          <button type="button" onClick={() => onNavigate("marketing")}><span>Units 30d</span><strong>{data.sales.totalUnits30d}</strong></button>
          <button type="button" onClick={() => onNavigate("marketing")}><span>Revenue 30d</span><strong>{new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(data.sales.totalRevenue30d)}</strong></button>
          <button type="button" onClick={() => onNavigate("products", { query: data.sales.topProduct })}><span>Top Product</span><strong>{data.sales.topProduct}</strong></button>
        </div>
      </section>

      <div className="report-layout">
        <section className="panel report-section">
          <div className="product-table-head"><div><h2>Workflow Breakdown</h2><span>แยกสถานะงานตามทีม AI</span></div><Activity /></div>
          <div className="report-workflows">
            {data.workflow.map((item) => {
              const total = Math.max(item.completed + item.waiting + item.blocked, 1);
              return (
                <button type="button" key={item.id} onClick={() => navigateWorkflow(item.id)}>
                  <div><strong>{item.label}</strong><span>{item.completed} done · {item.waiting} waiting · {item.blocked} blocked</span></div>
                  <div className="report-bar" aria-label={`${item.label} workflow status`}>
                    <i className="done" style={{ width: `${(item.completed / total) * 100}%` }} />
                    <i className="waiting" style={{ width: `${(item.waiting / total) * 100}%` }} />
                    <i className="blocked" style={{ width: `${(item.blocked / total) * 100}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel report-section report-summary">
          <div className="product-table-head"><div><h2>AI Summary</h2><span>ข้อความจาก Report Agent</span></div><FileBarChart /></div>
          <pre>{data.summaryText}</pre>
        </section>
      </div>

      <div className="report-layout">
        <section className="panel report-section">
          <div className="product-table-head"><div><h2>Risk Watch</h2><span>จุดที่ควรจัดการก่อนเผยแพร่</span></div><ShieldAlert /></div>
          <div className="report-risk-list">
            {data.risks.map((risk) => (
                <button
                  key={risk.id}
                  type="button"
                  onClick={() => onNavigate(
                    risk.source === "promotion" ? "promotions" : risk.source === "content" ? "content" : "products",
                    { query: risk.title }
                  )}
                >
                <span className={`risk-badge risk-${risk.riskLevel}`}>{risk.riskLevel}</span>
                <div><strong>{risk.title}</strong><small>{risk.source} · {risk.status}</small><p>{risk.note}</p></div>
              </button>
            ))}
            {!data.risks.length && <div className="empty-state">ไม่มีความเสี่ยงสำคัญ</div>}
          </div>
        </section>

        <section className="panel report-section">
          <div className="product-table-head"><div><h2>Next Actions</h2><span>ลำดับงานแนะนำสำหรับวันนี้</span></div><Sparkles /></div>
          <div className="report-actions">
            {data.recommendations.map((item) => (
              <button
                className={`priority-${item.priority}`}
                key={item.id}
                type="button"
                onClick={() => onNavigate(
                  /promo|discount|bundle|โปร/i.test(`${item.title} ${item.detail}`) ? "promotions" : /content|caption|qa|post|โพสต์/i.test(`${item.title} ${item.detail}`) ? "content" : /setting|import|sheet|api/i.test(`${item.title} ${item.detail}`) ? "settings" : "products",
                  { query: item.title }
                )}
              >
                <span>{item.priority}</span>
                <div><strong>{item.title}</strong><p>{item.detail}</p><small>{item.owner}</small></div>
              </button>
            ))}
            {!data.recommendations.length && <div className="empty-state">ระบบไม่มีงานเร่งด่วนเพิ่มเติม</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
