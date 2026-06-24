import { AlertTriangle, Bell, Check, CircleDot, Megaphone, RefreshCw, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "./apiClient";

type NavigateFn = (
  page: string,
  context?: { sku?: string; contentId?: string; promotionId?: string; query?: string; tab?: "promotions" | "approvals" }
) => void;

type DashboardAlert = {
  id: string;
  type: string;
  message: string;
  age: string;
};

type WorkflowRun = {
  runId: string;
  workflowName: string;
  status: "running" | "completed" | "failed";
  startedAt: string;
  finishedAt: string;
  error?: string | null;
};

type ApprovalSummary = {
  id: string;
  kind: "content" | "promotion";
  title: string;
  riskLevel: "low" | "medium" | "high";
};

type NotificationItem = {
  id: string;
  source: "alert" | "workflow" | "approval";
  tone: "info" | "success" | "warning" | "error";
  title: string;
  detail: string;
  time: string;
  page: string;
  context?: Parameters<NavigateFn>[1];
};

const READ_KEY = "ai-shop:notification-reads";

function loadReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = window.localStorage.getItem(READ_KEY);
    if (!stored) return new Set();
    const list = JSON.parse(stored) as string[];
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(READ_KEY, JSON.stringify([...ids].slice(-200)));
  } catch {
    // ignore quota errors
  }
}

function relativeTime(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return "เมื่อกี้";
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)} นาทีที่แล้ว`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)} ชั่วโมงที่แล้ว`;
  return date.toLocaleDateString("th-TH", { dateStyle: "short" });
}

function workflowLabel(name: string): string {
  return {
    "auto:once": "Auto Run",
    "ceo:daily": "CEO Daily",
    "marketing:campaign": "Marketing Campaign",
    "product:intake": "Product Intake",
    "product:write": "Product Write",
    "product:qa": "Product QA",
    "content:plan": "Content Plan",
    "content:write": "Content Write",
    "content:qa": "Content QA",
    "image:plan": "Image Plan",
    "promo:suggest": "Promotion Suggest",
    "manager:final-check": "Manager Check",
    "report:daily": "Daily Report"
  }[name] ?? name;
}

function alertTone(type: string): NotificationItem["tone"] {
  if (type === "error") return "error";
  if (type === "warning") return "warning";
  if (type === "success") return "success";
  return "info";
}

function alertPage(message: string): { page: string; context?: NotificationItem["context"] } {
  if (/promo|โปร/i.test(message)) return { page: "promotions", context: { query: message } };
  if (/qa|content|คอนเทนต์|caption/i.test(message)) return { page: "content", context: { query: message } };
  if (/sku|stock|สินค้า/i.test(message)) return { page: "products", context: { query: message } };
  return { page: "overview" };
}

function buildNotifications(
  alerts: DashboardAlert[],
  runs: WorkflowRun[],
  approvals: ApprovalSummary[]
): NotificationItem[] {
  const items: NotificationItem[] = [];

  for (const alert of alerts) {
    const { page, context } = alertPage(alert.message);
    items.push({
      id: `alert-${alert.id}`,
      source: "alert",
      tone: alertTone(alert.type),
      title: alert.message,
      detail: alert.age,
      time: "",
      page,
      context
    });
  }

  for (const run of runs.slice(0, 8)) {
    if (run.status === "running") continue;
    const tone: NotificationItem["tone"] = run.status === "failed" ? "error" : "success";
    items.push({
      id: `run-${run.runId}`,
      source: "workflow",
      tone,
      title:
        run.status === "failed"
          ? `${workflowLabel(run.workflowName)} ล้มเหลว`
          : `${workflowLabel(run.workflowName)} เสร็จแล้ว`,
      detail: run.status === "failed" ? run.error || "เกิดข้อผิดพลาด" : "พร้อมใช้งาน",
      time: run.finishedAt || run.startedAt,
      page: "reports"
    });
  }

  for (const approval of approvals) {
    items.push({
      id: `approval-${approval.kind}-${approval.id}`,
      source: "approval",
      tone: approval.riskLevel === "high" ? "warning" : "info",
      title: `รออนุมัติ: ${approval.title}`,
      detail: approval.kind === "promotion" ? "Promotion" : "Content",
      time: "",
      page: approval.kind === "promotion" ? "promotions" : "content",
      context: approval.kind === "promotion"
        ? { tab: "approvals", promotionId: approval.id }
        : { contentId: approval.id }
    });
  }

  return items;
}

export function NotificationBell({ onNavigate }: { onNavigate: NavigateFn }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadIds());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [dashboardRes, runsRes, promosRes] = await Promise.all([
          apiFetch("/api/dashboard"),
          apiFetch("/api/workflows/runs"),
          apiFetch("/api/promotions")
        ]);
        const dashboard = dashboardRes.ok ? await dashboardRes.json() : { alerts: [] };
        const runs = runsRes.ok ? await runsRes.json() : { runs: [] };
        const promos = promosRes.ok ? await promosRes.json() : { approvals: [] };
        if (cancelled) return;
        setItems(buildNotifications(
          dashboard.alerts ?? [],
          runs.runs ?? [],
          (promos.approvals ?? []).map((approval: { id: string; kind: "content" | "promotion"; title: string; riskLevel: "low" | "medium" | "high" }) => ({
            id: approval.id,
            kind: approval.kind,
            title: approval.title,
            riskLevel: approval.riskLevel
          }))
        ));
      } catch {
        // silently keep previous notifications
      }
    }
    load();
    const timer = window.setInterval(load, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const unreadCount = useMemo(
    () => items.filter((item) => !readIds.has(item.id)).length,
    [items, readIds]
  );

  function markRead(id: string) {
    if (readIds.has(id)) return;
    const next = new Set(readIds);
    next.add(id);
    setReadIds(next);
    saveReadIds(next);
  }

  function markAllRead() {
    const next = new Set(readIds);
    for (const item of items) next.add(item.id);
    setReadIds(next);
    saveReadIds(next);
  }

  function selectItem(item: NotificationItem) {
    markRead(item.id);
    onNavigate(item.page, item.context);
    setOpen(false);
  }

  return (
    <div className="notification-wrap" ref={containerRef}>
      <button
        type="button"
        className="notification-trigger"
        aria-label={`การแจ้งเตือน ${unreadCount} รายการ`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={18} />
        {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>
      {open && (
        <div className="notification-panel" role="dialog" aria-label="การแจ้งเตือน">
          <div className="notification-head">
            <strong>การแจ้งเตือน</strong>
            {unreadCount > 0 ? (
              <button type="button" className="notification-clear" onClick={markAllRead}>
                อ่านแล้วทั้งหมด
              </button>
            ) : (
              <span className="notification-empty-tag">อ่านครบแล้ว</span>
            )}
          </div>
          <div className="notification-list">
            {items.length === 0 && (
              <div className="empty-state">ไม่มีการแจ้งเตือน</div>
            )}
            {items.map((item) => {
              const Icon =
                item.source === "workflow" ? RefreshCw :
                item.source === "approval" ? Megaphone :
                item.tone === "error" ? AlertTriangle :
                item.tone === "success" ? Check :
                item.tone === "warning" ? AlertTriangle :
                CircleDot;
              const isRead = readIds.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`notification-item tone-${item.tone} ${isRead ? "is-read" : "is-unread"}`}
                  onClick={() => selectItem(item)}
                >
                  <span className="notification-icon"><Icon size={16} /></span>
                  <div className="notification-body">
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                    {item.time && <small>{relativeTime(item.time)}</small>}
                  </div>
                  {!isRead && <i className="notification-dot" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="notification-footer"
            onClick={() => {
              onNavigate("overview");
              setOpen(false);
            }}
          >
            ดูทั้งหมดในภาพรวม
            <X size={14} aria-hidden="true" style={{ visibility: "hidden" }} />
          </button>
        </div>
      )}
    </div>
  );
}
