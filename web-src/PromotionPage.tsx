import {
  AlertTriangle,
  Check,
  Clock3,
  Eye,
  Gift,
  Pause,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  Tags,
  X,
  XCircle,
  type LucideIcon
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "./apiClient";

type Promotion = {
  id: string;
  type: string;
  productSku: string;
  productName: string;
  bundleSku: string;
  discountType: string;
  discountValue: string;
  startDate: string;
  endDate: string;
  reason: string;
  expectedGoal: string;
  riskNote: string;
  managerNote: string;
  status: string;
  createdBy: string;
  createdAt: string;
  approvedAt: string;
  hasMarginData: boolean;
  stock: number | null;
  stockLabel: string;
  marginPercent: number | null;
  riskLevel: "low" | "medium" | "high";
  routeLabel: string;
  approvalReadiness: "ready" | "needs_review" | "blocked";
  strategyLabels: string[];
  decisionSummary: string;
  watchouts: string[];
  approvalBlockedReason: string;
};

type Approval = {
  id: string;
  kind: "content" | "promotion";
  title: string;
  subtitle: string;
  status: string;
  riskLevel: "low" | "medium" | "high";
  score: number | null;
  reason: string;
  createdAt: string;
};

type PromotionData = {
  mode: "live" | "demo";
  summary: { total: number; suggested: number; approved: number; rejected: number; hold: number };
  promotions: Promotion[];
  approvals: Approval[];
};

function readinessLabel(value: Promotion["approvalReadiness"]): string {
  if (value === "ready") return "พร้อมอนุมัติ";
  if (value === "blocked") return "ติดเงื่อนไข";
  return "ต้องเช็กเพิ่ม";
}

function stockTone(value: Promotion["riskLevel"], stock: Promotion["stock"]): string {
  if (stock !== null && stock <= 0) return "bad";
  if (value === "high") return "bad";
  if (value === "medium") return "warn";
  return "good";
}

function promotionIssue(promotion: Promotion): string {
  return promotion.approvalBlockedReason || promotion.watchouts[0] || "";
}

export function PromotionPage({
  onMessage,
  focusPromotionId,
  focusQuery,
  initialTab
}: {
  onMessage: (message: string) => void;
  focusPromotionId?: string;
  focusQuery?: string;
  initialTab?: "promotions" | "approvals";
}) {
  const [data, setData] = useState<PromotionData | null>(null);
  const [tab, setTab] = useState<"promotions" | "approvals">("promotions");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Promotion | null>(null);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    const response = await apiFetch("/api/promotions");
    if (!response.ok) throw new Error("โหลด Promotions ไม่สำเร็จ");
    setData(await response.json());
  }, []);

  useEffect(() => {
    load().catch((error) => onMessage(error.message));
  }, [load, onMessage]);

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (focusQuery) {
      setQuery(focusQuery);
    }
  }, [focusQuery]);

  useEffect(() => {
    if (!data || !focusPromotionId) return;
    const match = data.promotions.find((item) => item.id === focusPromotionId);
    if (match) {
      setSelected(match);
      setTab("promotions");
      if (!focusQuery) {
        setQuery(match.productSku);
      }
    }
  }, [data, focusPromotionId, focusQuery]);

  const filtered = useMemo(() => (data?.promotions ?? []).filter((item) =>
    !query || `${item.type} ${item.productSku} ${item.productName} ${item.strategyLabels.join(" ")}`.toLowerCase().includes(query.toLowerCase())
  ), [data, query]);

  const logicStats = useMemo(() => {
    const promotions = data?.promotions ?? [];
    return {
      ceoDriven: promotions.filter((item) => item.strategyLabels.includes("CEO priority")).length,
      campaignDriven: promotions.filter((item) => item.strategyLabels.includes("Campaign focus")).length,
      marginReady: promotions.filter((item) => item.hasMarginData).length,
      blocked: promotions.filter((item) => item.approvalReadiness === "blocked").length
    };
  }, [data]);

  async function runSuggestion() {
    setRunning(true);
    try {
      const response = await apiFetch("/api/workflows/promo:suggest/run", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "สร้าง Promotion Suggestion ไม่สำเร็จ");
      onMessage(`สร้างข้อเสนอ Promotion แล้ว Run ID: ${result.runId}`);
      await load();
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setRunning(false);
    }
  }

  async function promotionAction(id: string, action: "approve" | "reject" | "hold") {
    const response = await apiFetch(`/api/promotions/${id}/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}"
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "ดำเนินการไม่สำเร็จ");
    onMessage(action === "approve" ? "อนุมัติ Promotion แล้ว" : action === "reject" ? "ปฏิเสธ Promotion แล้ว" : "พัก Promotion แล้ว");
    setSelected(null);
    await load();
  }

  async function contentApproval(id: string, action: "approve" | "rewrite") {
    const response = await apiFetch(`/api/content/${id}/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(action === "rewrite" ? { instruction: "เจ้าของร้านส่งกลับให้แก้ไข" } : {})
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "ดำเนินการไม่สำเร็จ");
    onMessage(action === "approve" ? "อนุมัติคอนเทนต์แล้ว" : "ส่งคอนเทนต์กลับแก้ไขแล้ว");
    await load();
  }

  if (!data) {
    return <div className="panel products-loading"><RefreshCw className="spin" /> กำลังโหลด Promotions...</div>;
  }

  return <div className="promotion-page">
    <div className="promotion-summary">
      <PromoMetric icon={Tags} label="ทั้งหมด" value={data.summary.total} tone="blue" />
      <PromoMetric icon={Clock3} label="รออนุมัติ" value={data.summary.suggested} tone="yellow" />
      <PromoMetric icon={Check} label="อนุมัติแล้ว" value={data.summary.approved} tone="green" />
      <PromoMetric icon={Pause} label="พักไว้" value={data.summary.hold} tone="purple" />
      <PromoMetric icon={XCircle} label="ปฏิเสธ" value={data.summary.rejected} tone="pink" />
    </div>

    <div className="panel promotion-playbook">
      <div>
        <span className="eyebrow">AI PROMOTION LOGIC</span>
        <h2>CEO + Marketing + Sales Rules</h2>
        <p>AI จะดู stock, margin, risk, campaign focus และกฎร้านก่อนเลือกเส้นทางโปรว่าควรเป็นส่วนลด, bundle หรือของแถม</p>
      </div>
      <div className="promotion-playbook-stats">
        <article><strong>{logicStats.ceoDriven}</strong><span>CEO-driven</span></article>
        <article><strong>{logicStats.campaignDriven}</strong><span>Campaign-linked</span></article>
        <article><strong>{logicStats.marginReady}</strong><span>Margin ready</span></article>
        <article><strong>{logicStats.blocked}</strong><span>Blocked by rules</span></article>
      </div>
    </div>

    <div className="panel promotion-toolbar">
      <div className="approval-tabs">
        <button className={tab === "promotions" ? "active" : ""} onClick={() => setTab("promotions")}>Promotion Suggestions</button>
        <button className={tab === "approvals" ? "active" : ""} onClick={() => setTab("approvals")}>Owner Approval <span>{data.approvals.length}</span></button>
      </div>
      {tab === "promotions" && <>
        <div className="product-search">
          <Search size={17} />
          <input aria-label="ค้นหา Promotion" placeholder="ค้นหาประเภท SKU หรือสัญญาณ AI" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <button className="run-product-button" onClick={runSuggestion} disabled={running}>
          {running ? <RefreshCw className="spin" size={16} /> : <Play size={16} />}
          {running ? "กำลังวิเคราะห์..." : "สร้างข้อเสนอใหม่"}
        </button>
      </>}
    </div>

    {tab === "promotions"
      ? <div className="promotion-grid">
        {filtered.map((promotion) => {
          const issue = promotionIssue(promotion);
          return <article className={`panel promotion-card promo-status-${promotion.status}`} key={promotion.id}>
            <div className="queue-card-top">
              <span className="promotion-type"><Gift size={13} />{promotion.type}</span>
              <span className={`content-status status-${promotion.status}`}>{promotion.status}</span>
            </div>
            <h3>{promotion.productName}</h3>
            <div className="queue-product">{promotion.productSku}</div>
            <p>{promotion.decisionSummary}</p>
            {(promotion.discountType || promotion.discountValue) && <div className="discount-line">{promotion.discountValue}{promotion.discountType === "percent" ? "%" : ""} {promotion.discountType}</div>}
            {promotion.bundleSku && <div className="bundle-line">{promotion.productSku}<span>+</span>{promotion.bundleSku}</div>}
            <div className="promotion-facts-grid">
              <div><span>Stock</span><strong className={stockTone(promotion.riskLevel, promotion.stock)}>{promotion.stockLabel}</strong></div>
              <div><span>Margin</span><strong className={promotion.hasMarginData ? "good" : "bad"}>{promotion.hasMarginData ? `${promotion.marginPercent ?? "-"}%` : "ไม่มี"}</strong></div>
              <div><span>Approval</span><strong className={promotion.approvalReadiness === "blocked" ? "bad" : promotion.approvalReadiness === "ready" ? "good" : "warn"}>{readinessLabel(promotion.approvalReadiness)}</strong></div>
            </div>
            {issue && <div className="queue-issue"><AlertTriangle size={13} />{issue}</div>}
            <button aria-label={`ดู Promotion ${promotion.productName}`} onClick={() => setSelected(promotion)}><Eye size={15} />ดูข้อเสนอ</button>
          </article>;
        })}
      </div>
      : <ApprovalCenter approvals={data.approvals} onContent={contentApproval} onPromotion={promotionAction} onMessage={onMessage} />}

    {selected && <PromotionDrawer promotion={selected} onClose={() => setSelected(null)} onAction={(action) => promotionAction(selected.id, action).catch((error) => onMessage(error.message))} />}
  </div>;
}

function PromoMetric({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: number; tone: string }) {
  return <div className={`panel marketing-metric tone-${tone}`}><span><Icon size={20} /></span><div><strong>{value}</strong><small>{label}</small></div></div>;
}

function ApprovalCenter({
  approvals,
  onContent,
  onPromotion,
  onMessage
}: {
  approvals: Approval[];
  onContent: (id: string, action: "approve" | "rewrite") => Promise<void>;
  onPromotion: (id: string, action: "approve" | "reject" | "hold") => Promise<void>;
  onMessage: (message: string) => void;
}) {
  return <div className="panel approval-center"><div className="product-table-head"><div><h2>Owner Approval Center</h2><span>ทุก action ต้องยืนยันโดยเจ้าของร้าน</span></div><ShieldCheck /></div>
    <div className="approval-list">{approvals.map((item) => <article key={`${item.kind}-${item.id}`}>
      <div className={`approval-kind kind-${item.kind}`}>{item.kind === "content" ? "CONTENT" : "PROMOTION"}</div>
      <div className="approval-copy"><h3>{item.title}</h3><span>{item.subtitle}</span><p>{item.reason}</p></div>
      <div className="approval-risk"><span className={`risk-badge risk-${item.riskLevel}`}>{item.riskLevel}</span>{item.score !== null && <strong>{item.score}/100</strong>}</div>
      <div className="approval-actions">{item.kind === "content"
        ? <><button onClick={() => onContent(item.id, "rewrite").catch((error) => onMessage(error.message))}><XCircle size={14} />แก้ไข</button><button className="approve" onClick={() => onContent(item.id, "approve").catch((error) => onMessage(error.message))}><Check size={14} />อนุมัติ</button></>
        : <><button onClick={() => onPromotion(item.id, "hold").catch((error) => onMessage(error.message))}><Pause size={14} />พัก</button><button onClick={() => onPromotion(item.id, "reject").catch((error) => onMessage(error.message))}><X size={14} />ปฏิเสธ</button><button className="approve" disabled={item.riskLevel === "high"} onClick={() => onPromotion(item.id, "approve").catch((error) => onMessage(error.message))}><Check size={14} />{item.riskLevel === "high" ? "ถูกบล็อก" : "อนุมัติ"}</button></>}</div>
    </article>)}
    {!approvals.length && <div className="empty-state">ไม่มีรายการรออนุมัติ</div>}</div>
  </div>;
}

function PromotionDrawer({
  promotion,
  onClose,
  onAction
}: {
  promotion: Promotion;
  onClose: () => void;
  onAction: (action: "approve" | "reject" | "hold") => void;
}) {
  const canDecide = promotion.status === "suggested";
  const canApprove = canDecide && !promotion.approvalBlockedReason;
  return <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="content-drawer" aria-label="รายละเอียด Promotion">
    <div className="drawer-head"><div><span className="eyebrow">PROMOTION SUGGESTION</span><h2>{promotion.type}: {promotion.productName}</h2><p>{promotion.productSku}</p></div><button aria-label="ปิด Promotion" onClick={onClose}><X /></button></div>
    <div className="content-drawer-status">
      <span className={`content-status status-${promotion.status}`}>{promotion.status}</span>
      <span className={`risk-badge risk-${promotion.riskLevel}`}>{promotion.riskLevel}</span>
      <span className={`risk-badge ${promotion.approvalReadiness === "blocked" ? "risk-high" : promotion.approvalReadiness === "ready" ? "risk-low" : "risk-medium"}`}>{readinessLabel(promotion.approvalReadiness)}</span>
    </div>
    <section><h3>AI Decision</h3><p>{promotion.decisionSummary}</p>{!!promotion.strategyLabels.length && <div className="promotion-signals">{promotion.strategyLabels.map((label) => <span className="pill" key={label}>{label}</span>)}</div>}</section>
    <section><h3>Business Signals</h3><div className="promotion-detail-grid">
      <div><span>Stock</span><strong>{promotion.stockLabel}</strong></div>
      <div><span>Margin</span><strong>{promotion.hasMarginData ? `${promotion.marginPercent ?? "-"}%` : "ไม่มีข้อมูล"}</strong></div>
      <div><span>Route</span><strong>{promotion.routeLabel}</strong></div>
      <div><span>Goal</span><strong>{promotion.expectedGoal || "รอระบุ"}</strong></div>
    </div></section>
    <section><h3>เหตุผลจากระบบ</h3><p>{promotion.reason}</p></section>
    {(promotion.discountValue || promotion.bundleSku) && <section><h3>รายละเอียดข้อเสนอ</h3>{promotion.bundleSku && <div className="bundle-line">{promotion.productSku}<span>+</span>{promotion.bundleSku}</div>}{promotion.discountValue && <div className="discount-line">{promotion.discountValue}{promotion.discountType === "percent" ? "%" : ""} {promotion.discountType}</div>}</section>}
    <section><h3>Watchouts</h3>{promotion.watchouts.length ? <div className="promotion-watchouts">{promotion.watchouts.map((item) => <div className="rule-callout" key={item}><AlertTriangle size={15} />{item}</div>)}</div> : <p>ไม่มีประเด็นเสี่ยงเพิ่มเติม</p>}</section>
    <section><h3>Manager Note</h3><p>{promotion.managerNote || "ไม่มีหมายเหตุ"}</p></section>
    <div className="promotion-drawer-actions"><button disabled={!canDecide} onClick={() => onAction("hold")}><Pause size={15} />พัก</button><button disabled={!canDecide} onClick={() => onAction("reject")}><XCircle size={15} />ปฏิเสธ</button><button className="approve-action" disabled={!canApprove} onClick={() => onAction("approve")}><Check size={15} />{canApprove ? "อนุมัติ" : "อนุมัติไม่ได้"}</button></div>
  </aside></div>;
}
