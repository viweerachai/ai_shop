import {
  AlertTriangle,
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Eye,
  FileText,
  Filter,
  PenLine,
  Play,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "./apiClient";

type ContentItem = {
  id: string; week: string; contentType: string; theme: string; productSku: string;
  productName: string; platform: string; status: string; idea: string; caption: string;
  hashtags: string[]; writerNote: string; strategyLabels: string[]; riskNote: string; riskLevel: "low" | "medium" | "high";
  qaStatus: string; qaScore: number; qaIssues: string[]; qaNote: string;
  rewriteInstruction: string; imageStatus: string; ownerStatus: string;
  publishDate: string; updatedAt: string;
};
type ContentData = {
  mode: "live" | "demo";
  summary: { total: number; readyToWrite: number; waitingQa: number; needsRewrite: number; ownerReview: number; readyToPost: number };
  content: ContentItem[];
};

const statusLabels: Record<string, string> = {
  ready_to_write: "รอเขียน",
  content_ready_for_qa: "รอ QA",
  content_passed: "QA ผ่าน",
  needs_rewrite: "ต้องแก้ไข",
  image_brief_ready: "Image Brief พร้อม",
  manager_final_check: "Manager Check",
  ready_to_post: "พร้อมโพสต์",
  owner_review_required: "รอเจ้าของอนุมัติ",
  auto_posted: "โพสต์แล้ว",
  failed: "ล้มเหลว"
};

export function ContentPage({
  onMessage,
  focusContentId,
  focusQuery
}: {
  onMessage: (message: string) => void;
  focusContentId?: string;
  focusQuery?: string;
}) {
  const [data, setData] = useState<ContentData | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<ContentItem | null>(null);
  const [running, setRunning] = useState("");

  const load = useCallback(async () => {
    const response = await apiFetch("/api/content");
    if (!response.ok) throw new Error("โหลด Content Queue ไม่สำเร็จ");
    setData(await response.json());
  }, []);
  useEffect(() => { load().catch((error) => onMessage(error.message)); }, [load, onMessage]);

  useEffect(() => {
    if (!focusQuery) return;
    setQuery(focusQuery);
  }, [focusQuery]);

  useEffect(() => {
    if (!data || !focusContentId) return;
    const match = data.content.find((item) => item.id === focusContentId);
    if (match) {
      setSelected(match);
      if (!focusQuery) {
        setQuery(match.productSku);
      }
    }
  }, [data, focusContentId, focusQuery]);

  const filtered = useMemo(() => (data?.content ?? []).filter((item) => {
    const text = `${item.theme} ${item.productSku} ${item.productName}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (status === "all" || item.status === status);
  }), [data, query, status]);

  async function runWorkflow(name: "content:write" | "content:qa" | "content:plan") {
    setRunning(name);
    try {
      const response = await apiFetch(`/api/workflows/${name}/run`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "รัน workflow ไม่สำเร็จ");
      onMessage(`เริ่ม ${name} แล้ว Run ID: ${result.runId}`);
      await load();
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally { setRunning(""); }
  }

  async function contentAction(item: ContentItem, action: "approve" | "rewrite") {
    const response = await apiFetch(`/api/content/${item.id}/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        action === "rewrite"
          ? { instruction: item.rewriteInstruction || "แก้ไขตามผล QA" }
          : {}
      )
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "ดำเนินการไม่สำเร็จ");
    onMessage(action === "approve" ? "อนุมัติคอนเทนต์แล้ว" : "ส่งกลับให้แก้ไขแล้ว");
    setSelected(null);
    await load();
  }

  if (!data) return <div className="panel products-loading"><RefreshCw className="spin" /> กำลังโหลด Content...</div>;
  const stats = [
    ["ทั้งหมด", data.summary.total, FileText, "blue"],
    ["รอเขียน", data.summary.readyToWrite, PenLine, "purple"],
    ["รอ QA", data.summary.waitingQa, ClipboardCheck, "yellow"],
    ["ต้องแก้ไข", data.summary.needsRewrite, AlertTriangle, "pink"],
    ["รออนุมัติ", data.summary.ownerReview, ShieldAlert, "yellow"],
    ["พร้อมโพสต์", data.summary.readyToPost, Check, "green"]
  ] as const;

  return (
    <div className="content-workspace">
      <div className="content-summary-grid">
        {stats.map(([label, value, Icon, tone]) => <div className={`panel content-stat tone-${tone}`} key={label}><span><Icon size={20} /></span><strong>{value}</strong><small>{label}</small></div>)}
      </div>
      <div className="panel content-controls">
        <div className="product-search"><Search size={17} /><input aria-label="ค้นหาคอนเทนต์" placeholder="ค้นหาหัวข้อหรือ SKU" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        <label className="filter-control"><Filter size={15} /><select aria-label="กรองสถานะคอนเทนต์" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">ทุกสถานะ</option>
          {Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select></label>
        <button onClick={() => runWorkflow("content:plan")}><Sparkles size={15} />วางแผน</button>
        <button onClick={() => runWorkflow("content:write")}><PenLine size={15} />เขียน</button>
        <button onClick={() => runWorkflow("content:qa")}><ClipboardCheck size={15} />ตรวจ QA</button>
      </div>
      <div className="panel content-queue-panel">
        <div className="product-table-head"><div><h2>Content & QA Queue</h2><span>แสดง {filtered.length} จาก {data.summary.total} รายการ</span></div><span className={`data-mode mode-${data.mode}`}>{data.mode} data</span></div>
        <div className="content-board">
          {filtered.map((item) => (
            <article className={`content-queue-card risk-${item.riskLevel}`} key={item.id}>
              <div className="queue-card-top"><span className="content-type-badge">{item.contentType}</span><span className={`content-status status-${item.status}`}>{statusLabels[item.status] ?? item.status}</span></div>
              <h3>{item.theme}</h3>
              <p>{item.idea}</p>
              <div className="queue-product"><FileText size={14} /><span>{item.productName}</span></div>
              {item.strategyLabels.length > 0 && <div className="queue-strategy-tags">{item.strategyLabels.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}</div>}
              {item.writerNote && <div className="queue-strategy-note"><Sparkles size={13} />{item.writerNote.split("|")[0].trim()}</div>}
              <div className="queue-card-meta"><span>{item.platform || "ยังไม่ระบุ platform"}</span><span>{item.publishDate || "ยังไม่กำหนดวัน"}</span></div>
              <div className="qa-meter"><div><span>QA Score</span><strong>{item.qaScore || "-"}</strong></div><i><b style={{ width: `${item.qaScore}%` }} /></i></div>
              {item.qaIssues.length > 0 && <div className="queue-issue"><AlertTriangle size={13} />{item.qaIssues[0]}</div>}
              <button aria-label={`ดูคอนเทนต์ ${item.theme}`} onClick={() => setSelected(item)}><Eye size={15} />ดูรายละเอียด<ChevronRight size={14} /></button>
            </article>
          ))}
          {!filtered.length && <div className="empty-state">ไม่พบคอนเทนต์ในคิวนี้</div>}
        </div>
      </div>
      {selected && <ContentDrawer item={selected} onClose={() => setSelected(null)} onAction={(action) => contentAction(selected, action).catch((error) => onMessage(error.message))} />}
    </div>
  );
}

function ContentDrawer({ item, onClose, onAction }: { item: ContentItem; onClose: () => void; onAction: (action: "approve" | "rewrite") => void }) {
  const canApprove =
    item.status === "owner_review_required" &&
    item.qaStatus === "passed" &&
    item.qaScore >= 90;
  const canRewrite = !["ready_to_post", "auto_posted"].includes(item.status);
  return <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <aside className="content-drawer" aria-label="รายละเอียดคอนเทนต์">
      <div className="drawer-head"><div><span className="eyebrow">CONTENT & QA</span><h2>{item.theme}</h2><p>{item.productName} · {item.platform}</p></div><button aria-label="ปิดรายละเอียดคอนเทนต์" onClick={onClose}><X /></button></div>
      <div className="content-drawer-status"><span className={`content-status status-${item.status}`}>{statusLabels[item.status] ?? item.status}</span><span className={`risk-badge risk-${item.riskLevel}`}>Risk: {item.riskLevel}</span></div>
      <section><h3>Content Brief</h3><p>{item.idea}</p></section>
      {(item.writerNote || item.riskNote) && <section><h3>Strategy Context</h3>
        {item.strategyLabels.length > 0 && <div className="hashtag-row">{item.strategyLabels.map((tag) => <span key={tag}>{tag}</span>)}</div>}
        {item.writerNote && <div className="drawer-ok"><Sparkles size={15} />{item.writerNote}</div>}
        {item.riskNote && <div className="rule-callout"><AlertTriangle size={15} />{item.riskNote}</div>}
      </section>}
      <section><h3>Caption Draft</h3><div className="caption-box">{item.caption || "ยังไม่มี Caption Draft"}</div><div className="hashtag-row">{item.hashtags.map((tag) => <span key={tag}>{tag}</span>)}</div></section>
      <section><div className="qa-title"><h3>QA Result</h3><strong>{item.qaScore || 0}/100</strong></div>
        <div className="qa-detail-grid"><div><span>QA Status</span><strong>{item.qaStatus || "ยังไม่ตรวจ"}</strong></div><div><span>Risk Level</span><strong>{item.riskLevel}</strong></div></div>
        {item.qaIssues.map((issue) => <div className="drawer-issue" key={issue}><AlertTriangle size={15} />{issue}</div>)}
        {item.qaNote && <p className="drawer-note">{item.qaNote}</p>}
      </section>
      {item.rewriteInstruction && <section><h3>Rewrite Instruction</h3><div className="rewrite-box">{item.rewriteInstruction}</div></section>}
      <div className="content-drawer-actions">
        <button className="rewrite-action" disabled={!canRewrite} onClick={() => onAction("rewrite")}><PenLine size={16} />ส่งกลับแก้ไข</button>
        <button className="approve-action" disabled={!canApprove} onClick={() => onAction("approve")}><Check size={16} />{canApprove ? "อนุมัติ" : "ยังอนุมัติไม่ได้"}</button>
      </div>
    </aside>
  </div>;
}
