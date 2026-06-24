import { Check, Play, RotateCcw } from "lucide-react";
import { apiFetch } from "./apiClient";

export type StrategyActionItem = {
  id: string;
  title: string;
  owner: "CEO" | "Marketing" | "Manager" | "Owner";
  priority: "high" | "medium" | "low";
  status: "ready" | "in_progress" | "completed" | "watch" | "blocked";
  reason: string;
  source: "sales" | "content" | "promotion" | "operations";
  sku?: string;
};

async function updateStrategyAction(id: string, status: StrategyActionItem["status"]) {
  const response = await apiFetch(`/api/strategy-actions/${id}/status`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "อัปเดตสถานะงานไม่สำเร็จ");
}

async function resetStrategyAction(id: string) {
  const response = await apiFetch(`/api/strategy-actions/${id}/reset`, { method: "POST" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "รีเซ็ตสถานะงานไม่สำเร็จ");
}

export function StrategyActionPanel({
  items,
  onMessage,
  onUpdated
}: {
  items: StrategyActionItem[];
  onMessage: (message: string) => void;
  onUpdated: () => Promise<void>;
}) {
  return (
    <div className="action-queue">
      {items.map((item) => (
        <div className={`action-item priority-${item.priority} status-${item.status}`} key={item.id}>
          <div className="action-item-head">
            <strong>{item.title}</strong>
            <div className="action-item-pills">
              <span className={`action-pill priority-${item.priority}`}>{item.priority}</span>
              <span className={`action-pill status-${item.status}`}>{item.status.replace("_", " ")}</span>
            </div>
          </div>
          <span>{item.owner}{item.sku ? ` • ${item.sku}` : ""}</span>
          <small>{item.reason}</small>
          <div className="action-controls">
            <button
              disabled={item.status === "completed" || item.status === "blocked"}
              onClick={() => updateStrategyAction(item.id, "in_progress").then(onUpdated).then(() => onMessage(`เริ่มงาน: ${item.title}`)).catch((error) => onMessage(error.message))}
            >
              <Play size={14} />เริ่ม
            </button>
            <button
              disabled={item.status === "completed"}
              className="approve"
              onClick={() => updateStrategyAction(item.id, "completed").then(onUpdated).then(() => onMessage(`ปิดงาน: ${item.title}`)).catch((error) => onMessage(error.message))}
            >
              <Check size={14} />Done
            </button>
            <button
              onClick={() => resetStrategyAction(item.id).then(onUpdated).then(() => onMessage(`รีเซ็ตงาน: ${item.title}`)).catch((error) => onMessage(error.message))}
            >
              <RotateCcw size={14} />Reset
            </button>
          </div>
        </div>
      ))}
      {!items.length && <div className="empty-state">ยังไม่มี action queue ล่าสุด</div>}
    </div>
  );
}
