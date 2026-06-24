import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Megaphone,
  ShieldAlert,
  Sparkles
} from "lucide-react";

type DashboardData = {
  generatedAt: string;
  metrics: Array<{ id: string; label: string; value: number; unit: string; note: string; tone: string }>;
  workflow: Array<{ id: string; label: string; description: string; status: string; count: number }>;
  readyContent: Array<{ id: string; title: string; product: string; platform: string; publishDate: string; ownerStatus: string; riskLevel: string; contentType: string }>;
  alerts: Array<{ id: string; type: string; message: string; age: string }>;
  timeline: Array<{ time: string; label: string; status: string }>;
  ceo: {
    salesSource: string;
    shopPriority: string;
    weeklyDirection: string;
    recommendation: string;
    drivers: string[];
    watchouts: string[];
    actions: Array<{ id: string; title: string; owner: string; priority: string; status: string; reason: string; sku?: string }>;
    priorityProducts: Array<{ sku: string; name: string; reason: string; stock: number | null; riskLevel: string; salesLast7d: number; salesLast30d: number }>;
    salesSummary: {
      orders30d: number;
      units30d: number;
      revenue30d: number;
      topProduct: string;
    };
  };
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0
  }).format(value);
}

function statusTone(status: string) {
  if (status === "completed") return "good";
  if (status === "running") return "warn";
  if (status === "failed" || status === "attention" || status === "blocked") return "bad";
  return "neutral";
}

function priorityLabel(priority: string): string {
  return {
    high: "High",
    medium: "Medium",
    low: "Low"
  }[priority] ?? priority;
}

function statusLabel(status: string): string {
  return {
    ready: "Ready",
    in_progress: "In progress",
    completed: "Completed",
    watch: "Watch",
    blocked: "Blocked"
  }[status] ?? status;
}

export function OverviewPage({
  data,
  onNavigate
}: {
  data: DashboardData;
  onNavigate: (page: string, context?: { sku?: string; contentId?: string; promotionId?: string; query?: string; tab?: "promotions" | "approvals" }) => void;
}) {
  return (
    <div className="overview-page">
      <section className="panel overview-hero">
        <div>
          <span className="eyebrow">STORE OPERATIONS OVERVIEW</span>
          <h2>{data.ceo.recommendation}</h2>
          <p>{data.ceo.shopPriority}</p>
        </div>
        <div className="overview-hero-stats">
          <article>
            <span>Sales Source</span>
            <strong>{data.ceo.salesSource}</strong>
          </article>
          <article>
            <span>Orders 30d</span>
            <strong>{data.ceo.salesSummary.orders30d}</strong>
          </article>
          <article>
            <span>Revenue 30d</span>
            <strong>{formatMoney(data.ceo.salesSummary.revenue30d)}</strong>
          </article>
          <article>
            <span>Top Product</span>
            <strong>{data.ceo.salesSummary.topProduct}</strong>
          </article>
        </div>
      </section>

      <section className="overview-grid">
        <div className="panel">
          <div className="section-heading"><Bot size={18} /><h2>CEO Direction</h2></div>
          <div className="overview-copy-list">
            <article>
              <span>Weekly Direction</span>
              <strong>{data.ceo.weeklyDirection}</strong>
            </article>
            {data.ceo.drivers.slice(0, 4).map((driver) => (
              <div className="marketing-list-item" key={driver}><Sparkles size={14} /><span>{driver}</span></div>
            ))}
          </div>
          <button className="run-product-button" onClick={() => onNavigate("reports")}><BarChart3 size={16} />ดูรายงาน CEO/Report</button>
        </div>

        <div className="panel">
          <div className="section-heading"><ShieldAlert size={18} /><h2>Watchouts</h2></div>
          <div className="overview-copy-list">
            {data.ceo.watchouts.length
              ? data.ceo.watchouts.slice(0, 5).map((warning) => (
                <div className="marketing-list-item warning" key={warning}><AlertTriangle size={14} /><span>{warning}</span></div>
              ))
              : <div className="empty-state">ยังไม่มี watchout สำคัญ</div>}
          </div>
          <button className="run-product-button" onClick={() => onNavigate("promotions")}><Megaphone size={16} />ไปคิวโปรโมชั่น/อนุมัติ</button>
        </div>
      </section>

      <section className="overview-grid">
        <div className="panel">
          <div className="product-table-head"><div><h2>Priority Products</h2><span>สินค้าที่ควรดันก่อน</span></div><Sparkles /></div>
          <div className="focus-products">
            {data.ceo.priorityProducts.map((item, index) => (
              <button key={item.sku} type="button" onClick={() => onNavigate("products", { sku: item.sku })}>
                <span>{index + 1}</span>
                <div className="focus-product-copy">
                  <strong>{item.name}</strong>
                  <small>{item.sku} • stock {item.stock ?? "-"} • sold 7d {item.salesLast7d} • sold 30d {item.salesLast30d}</small>
                  <em>{item.reason}</em>
                </div>
                <b className={`risk-badge risk-${item.riskLevel}`}>{item.riskLevel}</b>
              </button>
            ))}
          </div>
          <button className="run-product-button" onClick={() => onNavigate("products")}><ArrowRight size={16} />ไปหน้าสินค้า</button>
        </div>

        <div className="panel">
          <div className="product-table-head"><div><h2>Workflow Snapshot</h2><span>ดูว่าคิวไหนกำลังติดหรือกำลังเดิน</span></div><Clock3 /></div>
          <div className="overview-workflow-list">
            {data.workflow.map((item) => (
              <article key={item.id}>
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                </div>
                <div className={`overview-status ${statusTone(item.status)}`}>
                  <b>{item.count}</b>
                  <small>{item.status}</small>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="overview-grid">
        <div className="panel">
          <div className="product-table-head"><div><h2>Ready Content</h2><span>รายการที่พร้อมหรือใกล้พร้อมปล่อย</span></div><CheckCircle2 /></div>
          <div className="overview-content-list">
            {data.readyContent.length
              ? data.readyContent.slice(0, 6).map((item) => (
                <button key={item.id} type="button" onClick={() => onNavigate("content", { contentId: item.id, query: item.product })}>
                  <strong>{item.title}</strong>
                  <span>{item.contentType} • {item.platform}</span>
                  <small>{item.publishDate} • {item.ownerStatus}</small>
                </button>
              ))
              : <div className="empty-state">ยังไม่มีคอนเทนต์ที่พร้อมใช้งาน</div>}
          </div>
          <button className="run-product-button" onClick={() => onNavigate("content")}><ArrowRight size={16} />ไปหน้า Content</button>
        </div>

        <div className="panel">
          <div className="product-table-head"><div><h2>Alerts & Timeline</h2><span>สรุปสิ่งที่ต้องรีบดูวันนี้</span></div><CalendarClock /></div>
          <div className="overview-alert-list">
            {data.alerts.slice(0, 4).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(
                  item.id.startsWith("promo-") ? "promotions" : item.id.startsWith("qa-") ? "content" : "products",
                  { query: item.message }
                )}
              >
                <strong>{item.message}</strong>
                <span>{item.age}</span>
              </button>
            ))}
            {!data.alerts.length && <div className="empty-state">ยังไม่มี alert สำคัญ</div>}
          </div>
          <div className="overview-timeline-list">
            {data.timeline.slice(0, 4).map((item) => (
              <div key={`${item.time}-${item.label}`} className={`marketing-list-item ${statusTone(item.status)}`}>
                <Clock3 size={14} />
                <span>{item.time} • {item.label} • {item.status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="product-table-head"><div><h2>Action Queue Snapshot</h2><span>งานที่ CEO/ทีมผลักอยู่ตอนนี้</span></div><Megaphone /></div>
        <div className="overview-action-list">
          {data.ceo.actions.length
            ? data.ceo.actions.slice(0, 6).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(
                  item.source === "promotion" ? "promotions" : item.source === "content" ? "content" : "products",
                  item.source === "promotion"
                    ? { query: item.sku ?? item.title, tab: "promotions" }
                    : item.source === "content"
                      ? { query: item.sku ?? item.title }
                      : { sku: item.sku, query: item.title }
                )}
              >
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.owner}{item.sku ? ` • ${item.sku}` : ""}</span>
                  <small>{item.reason}</small>
                </div>
                <div className="action-item-pills">
                  <span className={`action-pill priority-${item.priority}`}>{priorityLabel(item.priority)}</span>
                  <span className={`action-pill status-${item.status}`}>{statusLabel(item.status)}</span>
                </div>
              </button>
            ))
            : <div className="empty-state">ยังไม่มี action queue</div>}
        </div>
      </section>
    </div>
  );
}
